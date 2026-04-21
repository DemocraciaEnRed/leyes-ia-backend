import { createUserContent, createPartFromUri } from '@google/genai';
import geminiService from './gemini.js';
import s3Client from './s3Client.js';
import model from '../models/index.js';
import { extractGeminiUsage, recordProjectAiUsageEvent } from './aiUsageAudit.js';

const GEMINI_MODEL = 'gemini-2.5-flash';

const buildProfilePrompt = (partyName, expandWithSearch) => {
  const basePrompt = `Sos un analista politico especializado en partidos politicos latinoamericanos.

Se te entrega la plataforma electoral y/o documentos oficiales del partido politico "${partyName}".

Tu tarea es generar un perfil estructurado del partido que incluya:

1. **Ideologia y valores fundamentales**: los principios ideologicos centrales del partido${expandWithSearch ? '.' : ' (ej: liberalismo economico, progresismo social, conservadurismo, etc.).'}
2. **Ejes tematicos clave**: las areas de politica publica en las que el partido tiene posiciones explicitas${expandWithSearch ? ' o inferibles.' : ' (economia, seguridad, medio ambiente, educacion, salud, derechos civiles, relaciones internacionales, etc.).'}
3. **Posiciones concretas**: para cada eje tematico, que postura toma el partido${expandWithSearch ? '.' : ' segun sus documentos.'}
4. **Propuestas destacadas**: las propuestas mas relevantes o diferenciadoras del partido.

Reglas:`;

  if (expandWithSearch) {
    return basePrompt + `
- Analiza primero los documentos proporcionados como fuente primaria.
- Luego, podes complementar con busquedas en internet para ampliar o verificar el perfil, SOLO si:
  - Las fuentes son oficiales (sitio web del partido, organos electorales, boletines oficiales).
  - O son medios periodisticos reconocidos y verificables.
  - No uses redes sociales, blogs personales ni fuentes anonimas.
- Para cada dato que provenga de una fuente externa, cita la fuente con titulo y URL.
- Si un eje tematico no esta cubierto ni en los documentos ni en fuentes confiables, indica "No se encontro informacion verificable".
- Usa un tono neutral, descriptivo y sin juicios de valor.
- El perfil debe ser util para que, en un paso posterior, una IA pueda predecir como votaria este partido frente a un proyecto de ley.
- Responde en español.`;
  }

  return basePrompt + `
- Basa tu analisis EXCLUSIVAMENTE en los documentos proporcionados. No busques informacion externa.
- Si un eje tematico no esta cubierto en los documentos, indica "No se explicita en los documentos cargados".
- Usa un tono neutral, descriptivo y sin juicios de valor.
- El perfil debe ser util para que, en un paso posterior, una IA pueda predecir como votaria este partido frente a un proyecto de ley.
- Responde en español.`;
};

export const generateProfile = async ({ partyId, expandWithSearch = false, userId }) => {
  const party = await model.PoliticalParty.findByPk(partyId, {
    include: [{
      model: model.PoliticalPartyFile,
      as: 'files',
    }],
  });

  if (!party) {
    throw new Error('Partido político no encontrado');
  }

  if (!party.files || party.files.length === 0) {
    throw new Error('El partido no tiene archivos cargados');
  }

  const prompt = buildProfilePrompt(party.name, expandWithSearch);
  const startTime = Date.now();

  // Upload each party file to Gemini
  const geminiFileParts = [];
  for (const file of party.files) {
    const fileStream = await s3Client.downloadFile(file.s3Key);
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    const uploadedFile = await geminiService.uploadFile(fileBuffer, file.name, file.mimeType);
    await geminiService.waitForFileActive(uploadedFile.name);
    geminiFileParts.push(createPartFromUri(uploadedFile.uri, uploadedFile.mimeType));
  }

  const config = {
    tools: expandWithSearch ? [{ googleSearch: {} }] : undefined,
  };

  const response = await geminiService.ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: createUserContent([...geminiFileParts, prompt]),
    config,
  });

  const profileSummary = response.text;
  const latencyMs = Date.now() - startTime;

  // Persist profile
  await party.update({
    profileSummary,
    profileExpandedWithSearch: expandWithSearch,
    profileGeneratedAt: new Date(),
  });

  return {
    party,
    profileSummary,
    geminiResponse: response,
    latencyMs,
  };
};
