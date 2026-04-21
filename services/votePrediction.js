import { z } from 'zod';
import { createUserContent, createPartFromUri } from '@google/genai';
import { Op } from 'sequelize';
import geminiService from './gemini.js';
import s3Client from './s3Client.js';
import model from '../models/index.js';
import { extractGeminiUsage, recordProjectAiUsageEvent, AI_USAGE_ACTIONS } from './aiUsageAudit.js';

const GEMINI_MODEL = 'gemini-2.5-flash';

const theoreticalResponseSchema = z.object({
  vote: z.enum(['yes', 'no', 'abstain', 'divided']),
  confidence: z.enum(['high', 'medium', 'low']),
  justification: z.string(),
  relevantProfilePoints: z.array(z.string()),
});

const contextualResponseSchema = z.object({
  vote: z.enum(['yes', 'no', 'abstain', 'divided']),
  confidence: z.enum(['high', 'medium', 'low']),
  justification: z.string(),
  differsFromTheoretical: z.boolean(),
  reasonForDifference: z.string().nullable(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().nullable(),
    date: z.string().nullable(),
  })),
});

const buildTheoreticalPrompt = (partyName, profileSummary) => {
  return `Sos un analista politico. Se te proporciona:

1. El perfil ideologico del partido politico "${partyName}".
2. El texto de un proyecto de ley.

Tu tarea:
- Determinar si, segun su perfil ideologico, este partido votaria A FAVOR o EN CONTRA de este proyecto de ley.
- Si el proyecto toca multiples ejes y el partido podria estar dividido, podes responder DIVIDIDO.

Responde con el siguiente formato JSON:
{
  "vote": "yes" | "no" | "abstain" | "divided",
  "confidence": "high" | "medium" | "low",
  "justification": "Explicacion en 2-4 parrafos de por que se llega a esta conclusion, citando los puntos del perfil del partido que son relevantes.",
  "relevantProfilePoints": ["Punto 1 del perfil que aplica", "Punto 2..."]
}

Reglas:
- NO busques en internet. Esta es una prediccion puramente teorica basada en el perfil.
- No emitas juicios de valor sobre el partido ni sobre el proyecto.
- Si el perfil no cubre los temas del proyecto, indica confidence "low" y explica por que.
- Responde en español.

Perfil del partido:
${profileSummary}`;
};

const buildContextualPrompt = (partyName, profileSummary, theoreticalPrediction, dateFrom, dateTo) => {
  let dateConstraint;
  if (dateFrom && dateTo) {
    dateConstraint = `Restriccion temporal: solo considera fuentes e informacion publicadas entre el ${dateFrom} y el ${dateTo} inclusive. Ignora cualquier evento o declaracion fuera de ese periodo.`;
  } else if (dateTo) {
    dateConstraint = `Restriccion temporal: solo considera fuentes e informacion publicadas HASTA el ${dateTo} inclusive. Ignora cualquier evento o declaracion posterior a esa fecha.`;
  } else {
    dateConstraint = `Restriccion temporal: usa toda la informacion disponible hasta la fecha actual.`;
  }

  return `Sos un analista politico. Se te proporciona:

1. El perfil ideologico del partido politico "${partyName}".
2. El texto de un proyecto de ley.
3. La prediccion teorica ya generada para este partido sobre este proyecto.

Tu tarea:
- Buscar en internet informacion verificable sobre la postura de este partido frente a este proyecto de ley en particular.
- Ajustar la prediccion teorica si la evidencia publica sugiere una postura diferente.
- Explicar si hay diferencia entre lo que el partido "deberia" votar segun su ideologia y lo que probablemente vote segun el contexto.

${dateConstraint}

Responde con el siguiente formato JSON:
{
  "vote": "yes" | "no" | "abstain" | "divided",
  "confidence": "high" | "medium" | "low",
  "justification": "Explicacion en 2-4 parrafos, distinguiendo postura ideologica vs postura de coyuntura.",
  "differsFromTheoretical": true | false,
  "reasonForDifference": "Si hay diferencia, explicar por que (acuerdos politicos, contexto del proyecto, etc.)" | null,
  "sources": [{"title": "...", "url": "...", "date": "YYYY-MM-DD o aproximada"}]
}

Reglas:
- Las fuentes deben ser verificables: medios periodisticos reconocidos, sitios oficiales, declaraciones publicas.
- No uses redes sociales, blogs personales ni fuentes anonimas.
- Si no encontras informacion contextual relevante, responde con la misma prediccion teorica e indica que no se encontro evidencia contextual.
- Responde en español.

Perfil del partido:
${profileSummary}

Prediccion teorica previa:
${JSON.stringify(theoreticalPrediction)}`;
};

const uploadProjectFileToGemini = async (project) => {
  const mainFile = await project.getMainFile();
  if (!mainFile) {
    throw new Error('El proyecto no tiene archivo principal');
  }

  const fileStream = await s3Client.downloadFile(mainFile.s3Key);
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  const fileBuffer = Buffer.concat(chunks);

  const uploadedFile = await geminiService.uploadFile(fileBuffer, mainFile.name, mainFile.mimeType);
  await geminiService.waitForFileActive(uploadedFile.name);

  return uploadedFile;
};

export const generateTheoreticalPredictions = async ({ projectId, userId }) => {
  const project = await model.Project.findByPk(projectId);
  if (!project) {
    throw new Error('Proyecto no encontrado');
  }

  const activeParties = await model.PoliticalParty.findAll({
    where: { status: 'active', profileSummary: { [Op.ne]: null } },
    order: [['name', 'ASC']],
  });

  if (activeParties.length === 0) {
    throw new Error('No hay partidos políticos activos con perfil generado');
  }

  // Upload project file to Gemini once for all predictions
  const geminiFile = await uploadProjectFileToGemini(project);
  const filePart = createPartFromUri(geminiFile.uri, geminiFile.mimeType);

  const predictions = [];

  for (const party of activeParties) {
    const startTime = Date.now();
    const prompt = buildTheoreticalPrompt(party.name, party.profileSummary);

    try {
      const response = await geminiService.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: createUserContent([filePart, prompt]),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: theoreticalResponseSchema.toJSONSchema(),
        },
      });

      const result = JSON.parse(response.text);
      const latencyMs = Date.now() - startTime;

      // Upsert prediction
      const [prediction] = await model.ProjectVotePrediction.upsert({
        projectId,
        politicalPartyId: party.id,
        theoreticalVote: result.vote,
        theoreticalJustification: result.justification,
        theoreticalSources: result.relevantProfilePoints?.map(p => ({ title: p })) || null,
        theoreticalConfidence: result.confidence,
        generatedAt: new Date(),
        generatedByUserId: userId,
        status: 'generated',
      }, {
        conflictFields: ['projectId', 'politicalPartyId'],
      });

      await recordProjectAiUsageEvent({
        projectId,
        userId,
        action: 'vote_prediction_theoretical',
        model: GEMINI_MODEL,
        geminiResponse: response,
        latencyMs,
      });

      predictions.push(prediction);
    } catch (error) {
      console.error(`Error generating theoretical prediction for party ${party.name}:`, error);
      // Create a failed prediction record
      const [prediction] = await model.ProjectVotePrediction.upsert({
        projectId,
        politicalPartyId: party.id,
        generatedAt: new Date(),
        generatedByUserId: userId,
        status: 'failed',
      }, {
        conflictFields: ['projectId', 'politicalPartyId'],
      });
      predictions.push(prediction);
    }
  }

  return predictions;
};

export const generateContextualPrediction = async ({ predictionId, dateFrom, dateTo, userId }) => {
  const prediction = await model.ProjectVotePrediction.findByPk(predictionId, {
    include: [
      { model: model.PoliticalParty, as: 'politicalParty' },
      { model: model.Project, as: 'project' },
    ],
  });

  if (!prediction) {
    throw new Error('Predicción no encontrada');
  }

  if (!prediction.theoreticalVote) {
    throw new Error('La predicción teórica aún no fue generada');
  }

  const party = prediction.politicalParty;
  const project = prediction.project;

  // Upload project file to Gemini
  const geminiFile = await uploadProjectFileToGemini(project);
  const filePart = createPartFromUri(geminiFile.uri, geminiFile.mimeType);

  const theoreticalPrediction = {
    vote: prediction.theoreticalVote,
    justification: prediction.theoreticalJustification,
    confidence: prediction.theoreticalConfidence,
  };

  const prompt = buildContextualPrompt(
    party.name,
    party.profileSummary,
    theoreticalPrediction,
    dateFrom,
    dateTo,
  );

  const startTime = Date.now();

  // Note: Google Search grounding (`tools`) cannot be combined with
  // `responseMimeType: 'application/json'`. We request plain text and
  // parse the JSON ourselves, validating with Zod.
  const response = await geminiService.ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: createUserContent([filePart, prompt]),
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  // Extract JSON from the response text (may be wrapped in ```json fences)
  const responseText = response.text
    ?? response.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('')
    ?? '';

  if (!responseText) {
    throw new Error('Gemini returned an empty response. Candidates: ' + JSON.stringify(response.candidates));
  }

  let rawText = responseText.trim();
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    rawText = jsonMatch[1].trim();
  }

  const result = contextualResponseSchema.parse(JSON.parse(rawText));
  const latencyMs = Date.now() - startTime;

  await prediction.update({
    contextualVote: result.vote,
    contextualJustification: result.justification,
    contextualSources: result.sources || null,
    contextualConfidence: result.confidence,
    contextualDateFrom: dateFrom || null,
    contextualDateTo: dateTo || null,
    contextualDiffersFromTheoretical: result.differsFromTheoretical,
    contextualReasonForDifference: result.reasonForDifference || null,
    status: 'generated',
  });

  await recordProjectAiUsageEvent({
    projectId: project.id,
    userId,
    action: 'vote_prediction_contextual',
    model: GEMINI_MODEL,
    geminiResponse: response,
    latencyMs,
  });

  return prediction;
};

export const regenerateAllPredictions = async ({ projectId, userId }) => {
  // Delete existing predictions for this project
  await model.ProjectVotePrediction.destroy({ where: { projectId } });

  // Regenerate theoretical for all active parties
  return generateTheoreticalPredictions({ projectId, userId });
};

export const getProjectPredictions = async ({ projectId }) => {
  return model.ProjectVotePrediction.findAll({
    where: { projectId },
    include: [
      {
        model: model.PoliticalParty,
        as: 'politicalParty',
        attributes: ['id', 'name', 'shortName', 'slug', 'logoUrl'],
      },
    ],
    order: [[{ model: model.PoliticalParty, as: 'politicalParty' }, 'name', 'ASC']],
  });
};

export const getPublicProjectPredictions = async ({ projectSlug }) => {
  const project = await model.Project.findOne({
    where: { slug: projectSlug, publishedAt: { [Op.ne]: null } },
    attributes: ['id'],
  });

  if (!project) return null;

  const predictions = await model.ProjectVotePrediction.findAll({
    where: { projectId: project.id, status: 'generated' },
    attributes: [
      'id', 'theoreticalVote', 'theoreticalJustification', 'theoreticalSources', 'theoreticalConfidence',
      'contextualVote', 'contextualJustification', 'contextualSources', 'contextualConfidence',
      'contextualDiffersFromTheoretical', 'contextualReasonForDifference',
      'generatedAt',
    ],
    include: [
      {
        model: model.PoliticalParty,
        as: 'politicalParty',
        attributes: ['id', 'name', 'shortName', 'slug', 'logoUrl'],
      },
    ],
    order: [[{ model: model.PoliticalParty, as: 'politicalParty' }, 'name', 'ASC']],
  });

  // Fetch disclaimer from Config
  const disclaimerConfig = await model.Config.findOne({ where: { key: 'votePredictionDisclaimer' } });

  return {
    predictions,
    disclaimer: disclaimerConfig?.value || null,
  };
};
