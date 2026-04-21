import { z } from 'zod';
import { Op } from 'sequelize';
import geminiService from './gemini.js';
import model from '../models/index.js';
import { extractGeminiUsage, recordProjectAiUsageEvent } from './aiUsageAudit.js';

const GEMINI_MODEL = 'gemini-2.5-flash';

const actaResultSchema = z.object({
  voteDate: z.string(),
  totalYes: z.number().int(),
  totalNo: z.number().int(),
  totalAbstain: z.number().int(),
  byParty: z.array(z.object({
    partyName: z.string(),
    votedYes: z.number().int(),
    votedNo: z.number().int(),
    votedAbstain: z.number().int(),
    majorityVote: z.enum(['yes', 'no', 'abstain', 'divided']),
  })),
});

const buildActaPrompt = () => {
  return `Se te entrega el acta de votacion de un proyecto de ley del congreso argentino.

Tu tarea:
- Extraer el resultado general: total de votos a favor, en contra, y abstenciones.
- Extraer el resultado desglosado por partido politico o bloque legislativo: para cada uno, cuantos legisladores votaron a favor, en contra, y se abstuvieron.
- Identificar el voto mayoritario de cada partido/bloque.

Responde con el siguiente formato JSON:
{
  "voteDate": "YYYY-MM-DD",
  "totalYes": number,
  "totalNo": number,
  "totalAbstain": number,
  "byParty": [
    {
      "partyName": "Nombre del partido o bloque",
      "votedYes": number,
      "votedNo": number,
      "votedAbstain": number,
      "majorityVote": "yes" | "no" | "abstain" | "divided"
    }
  ]
}

Reglas:
- Extrae los datos tal cual aparecen en el acta. No inferir ni completar datos faltantes.
- Si el acta agrupa por bloque legislativo y no por partido, usa el nombre del bloque.
- Si no podes determinar el partido/bloque de algun legislador, agrupa bajo "Sin bloque identificado".
- Responde en español.`;
};

export const processActa = async ({ projectId, fileBuffer, fileName, mimeType, sourceUrl, userId }) => {
  const project = await model.Project.findByPk(projectId);
  if (!project) {
    throw new Error('Proyecto no encontrado');
  }

  // Check if a vote result already exists
  const existing = await model.ProjectVoteResult.findOne({ where: { projectId } });
  if (existing) {
    throw new Error('Ya existe un resultado de votación para este proyecto');
  }

  const startTime = Date.now();

  // Upload acta to Gemini
  const uploadedFile = await geminiService.uploadFile(fileBuffer, fileName, mimeType);
  await geminiService.waitForFileActive(uploadedFile.name);

  const { createUserContent, createPartFromUri } = await import('@google/genai');
  const filePart = createPartFromUri(uploadedFile.uri, uploadedFile.mimeType);
  const prompt = buildActaPrompt();

  const response = await geminiService.ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: createUserContent([filePart, prompt]),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: actaResultSchema.toJSONSchema(),
    },
  });

  const result = JSON.parse(response.text);
  const latencyMs = Date.now() - startTime;

  // Create vote result
  const voteResult = await model.ProjectVoteResult.create({
    projectId,
    voteDate: result.voteDate,
    totalYes: result.totalYes,
    totalNo: result.totalNo,
    totalAbstain: result.totalAbstain,
    sourceUrl: sourceUrl || null,
    rawActaData: result,
  });

  // Match party names to existing PoliticalParty records and create by-party results
  const allParties = await model.PoliticalParty.findAll({ attributes: ['id', 'name', 'shortName'] });

  for (const partyResult of result.byParty) {
    // Try to match by name (case-insensitive)
    const matchedParty = allParties.find(p =>
      p.name.toLowerCase() === partyResult.partyName.toLowerCase() ||
      (p.shortName && p.shortName.toLowerCase() === partyResult.partyName.toLowerCase())
    );

    if (matchedParty) {
      await model.ProjectVoteResultByParty.create({
        projectVoteResultId: voteResult.id,
        politicalPartyId: matchedParty.id,
        votedYes: partyResult.votedYes,
        votedNo: partyResult.votedNo,
        votedAbstain: partyResult.votedAbstain,
        majorityVote: partyResult.majorityVote,
      });
    }
  }

  await recordProjectAiUsageEvent({
    projectId,
    userId,
    action: 'vote_result_acta_process',
    model: GEMINI_MODEL,
    geminiResponse: response,
    latencyMs,
  });

  return {
    voteResult,
    rawResult: result,
  };
};

export const getProjectVoteResult = async ({ projectId }) => {
  const voteResult = await model.ProjectVoteResult.findOne({
    where: { projectId },
    include: [
      {
        model: model.ProjectVoteResultByParty,
        as: 'resultsByParty',
        include: [
          {
            model: model.PoliticalParty,
            as: 'politicalParty',
            attributes: ['id', 'name', 'shortName', 'slug', 'logoUrl'],
          },
        ],
      },
    ],
  });

  return voteResult;
};

export const getPublicProjectVoteResult = async ({ projectSlug }) => {
  const project = await model.Project.findOne({
    where: { slug: projectSlug, publishedAt: { [Op.ne]: null } },
    attributes: ['id'],
  });

  if (!project) return null;

  return getProjectVoteResult({ projectId: project.id });
};
