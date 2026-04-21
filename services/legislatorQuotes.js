import { z } from 'zod';
import { Op } from 'sequelize';
import geminiService from './gemini.js';
import model from '../models/index.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const CACHE_MAX_AGE_HOURS = 48;

const legislatorQuoteSchema = z.object({
  legislatorId: z.number().int(),
  legislatorName: z.string(),
  found: z.boolean(),
  summary: z.string(),
  stance: z.enum(['a_favor', 'en_contra', 'neutral', 'ambiguo']).nullable(),
  quotes: z.array(z.object({
    date: z.string().nullable(),
    source: z.string(),
    sourceUrl: z.string().nullable(),
    content: z.string(),
    context: z.string(),
  })),
});

const legislatorQuotesResponseSchema = z.array(legislatorQuoteSchema);

const getJsonSchema = () => {
  return legislatorQuotesResponseSchema.toJSONSchema();
};

const buildPrompt = (project, legislators, dateRange) => {
  const legislatorLines = legislators.map(l => {
    const chamber = l.chamber === 'deputies' ? 'Diputado/a' : 'Senador/a';
    const province = l.Province?.name || l.province?.name || 'No especificada';
    const block = l.blockName || 'No especificado';
    return `- ID ${l.id}: ${l.firstName} ${l.lastName} (${chamber}, ${province}, Bloque: ${block})`;
  }).join('\n');

  const dateRestriction = dateRange?.start && dateRange?.end
    ? `Buscar declaraciones entre ${dateRange.start} y ${dateRange.end}`
    : dateRange?.start
      ? `Buscar declaraciones desde ${dateRange.start} en adelante`
      : dateRange?.end
        ? `Buscar declaraciones hasta ${dateRange.end}`
        : 'Sin restriccion temporal. Usar toda la informacion disponible.';

  return `Eres un analista politico argentino experto en legislacion y seguimiento parlamentario.

CONTEXTO DEL PROYECTO DE LEY:
- Titulo: ${project.title || project.name}
- Descripcion: ${project.description || 'No disponible'}
- Resumen: ${project.summary || 'No disponible'}
- Categoria: ${project.category || 'No especificada'}

LEGISLADORES A INVESTIGAR:
${legislatorLines}

RESTRICCION TEMPORAL: ${dateRestriction}

TAREA:
Busca declaraciones publicas, citas textuales, entrevistas, discursos en sesion, articulos de opinion, publicaciones en redes sociales verificadas, y cualquier pronunciamiento publico de cada legislador sobre este proyecto de ley o sobre tematicas directamente relacionadas con su contenido.

REGLAS ESTRICTAS:
1. Solo inclui citas o referencias que puedas respaldar con una fuente verificable y accesible.
2. NO inventes citas, declaraciones ni atribuyas opiniones sin evidencia concreta.
3. Si no encontras informacion para un legislador, indicalo explicitamente con "found": false y un summary explicativo. Esto es perfectamente aceptable.
4. Prioriza fuentes oficiales y de alta credibilidad: sitio de HCDN (hcdn.gob.ar), Senado (senado.gob.ar), medios de comunicacion reconocidos (Infobae, La Nacion, Clarin, Pagina 12, Telam, etc.), agencias de noticias.
5. Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD). Si no podes determinar la fecha exacta, usa null.
6. El campo "sourceUrl" debe ser la URL real de la fuente. Si no tenes la URL exacta, indica la fuente por nombre pero usa null en sourceUrl.
7. Distingui entre citas textuales (entrecomilladas) y parafraseos. En "content", si es cita textual encerrala entre comillas.
8. El campo "stance" debe reflejar la postura GENERAL inferida del conjunto de declaraciones encontradas, no de una cita individual.
9. El "summary" debe ser en formato markdown (sin titulares h1/h2/h3) y no debe superar los 500 caracteres.

FORMATO DE RESPUESTA:
Responde UNICAMENTE con un array JSON (sin texto adicional) con exactamente este esquema por cada legislador:
[
  {
    "legislatorId": <number, el ID del legislador>,
    "legislatorName": "<string, nombre completo>",
    "found": <boolean>,
    "summary": "<string, resumen en markdown sin h1/h2/h3, max 500 chars>",
    "stance": "<string: 'a_favor' | 'en_contra' | 'neutral' | 'ambiguo' | null>",
    "quotes": [
      {
        "date": "<string YYYY-MM-DD | null>",
        "source": "<string, nombre de la fuente>",
        "sourceUrl": "<string URL | null>",
        "content": "<string, la cita o declaracion>",
        "context": "<string, contexto de la declaracion>"
      }
    ]
  }
]

IMPORTANTE: Usa EXACTAMENTE estos nombres de campo en ingles. El resultado debe ser un array JSON directamente, sin envolverlo en un objeto.`;
};

export const findCachedResults = async ({ projectId, legislatorIds, dateRangeStart, dateRangeEnd, maxAgeHours = CACHE_MAX_AGE_HOURS }) => {
  const minCreatedAt = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const cached = await model.LegislatorQuoteSearch.findAll({
    where: {
      projectId,
      legislatorId: { [Op.in]: legislatorIds },
      dateRangeStart: dateRangeStart || null,
      dateRangeEnd: dateRangeEnd || null,
      createdAt: { [Op.gte]: minCreatedAt },
    },
    order: [['createdAt', 'DESC']],
  });

  // Deduplicate: keep only the most recent per legislator
  const byLegislator = new Map();
  for (const entry of cached) {
    if (!byLegislator.has(entry.legislatorId)) {
      byLegislator.set(entry.legislatorId, entry);
    }
  }

  return byLegislator;
};

export const searchQuotes = async ({ project, legislators, dateRange }) => {
  const prompt = buildPrompt(project, legislators, dateRange);

  // Note: Google Search grounding (`tools`) cannot be combined with
  // `responseMimeType: 'application/json'`. We request plain text and
  // parse the JSON ourselves, validating with Zod.
  const response = await geminiService.ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
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

  let parsed = JSON.parse(rawText);

  // Gemini may wrap the array inside an object (e.g. { "legislators": [...] }).
  // Unwrap it if that happens.
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    const values = Object.values(parsed);
    const arrValue = values.find(v => Array.isArray(v));
    if (arrValue) {
      parsed = arrValue;
    }
  }

  const results = legislatorQuotesResponseSchema.parse(parsed);

  // Extract grounding metadata
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
  const groundingSources = groundingMetadata ? {
    groundingChunks: groundingMetadata.groundingChunks || [],
    webSearchQueries: groundingMetadata.webSearchQueries || [],
    searchEntryPoint: groundingMetadata.searchEntryPoint || null,
  } : null;

  return {
    results,
    groundingSources,
    geminiResponse: response,
  };
};

export const persistResults = async ({ projectId, userId, legislatorResults, dateRangeStart, dateRangeEnd, geminiModel, geminiResponse, latencyMs, groundingSources }) => {
  const { extractGeminiUsage } = await import('./aiUsageAudit.js');
  const usage = extractGeminiUsage(geminiResponse);

  const records = [];
  for (const result of legislatorResults) {
    const record = await model.LegislatorQuoteSearch.create({
      projectId,
      userId,
      legislatorId: result.legislatorId,
      dateRangeStart: dateRangeStart || null,
      dateRangeEnd: dateRangeEnd || null,
      result,
      stance: result.stance || null,
      found: result.found,
      model: geminiModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs,
      groundingSources,
    });
    records.push(record);
  }

  return records;
};

export const getProjectQuoteSearches = async ({ projectId, legislatorId }) => {
  const where = { projectId };
  if (legislatorId) {
    where.legislatorId = legislatorId;
  }

  return model.LegislatorQuoteSearch.findAll({
    where,
    include: [
      {
        model: model.Legislator,
        as: 'legislator',
        attributes: ['id', 'firstName', 'lastName', 'chamber', 'blockName', 'photoUrl'],
        include: [{ model: model.Province, as: 'province', attributes: ['id', 'name'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

export const getPublicProjectQuoteSearches = async ({ projectSlug, legislatorId }) => {
  const project = await model.Project.findOne({
    where: { slug: projectSlug, publishedAt: { [Op.ne]: null } },
    attributes: ['id'],
  });

  if (!project) return null;

  const where = { projectId: project.id };
  if (legislatorId) {
    where.legislatorId = legislatorId;
  }

  const results = await model.LegislatorQuoteSearch.findAll({
    where,
    attributes: ['id', 'legislatorId', 'dateRangeStart', 'dateRangeEnd', 'result', 'stance', 'found', 'createdAt'],
    include: [
      {
        model: model.Legislator,
        as: 'legislator',
        attributes: ['id', 'firstName', 'lastName', 'chamber', 'blockName', 'photoUrl'],
        include: [{ model: model.Province, as: 'province', attributes: ['id', 'name'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return results;
};

export default {
  findCachedResults,
  searchQuotes,
  persistResults,
  getProjectQuoteSearches,
  getPublicProjectQuoteSearches,
  GEMINI_MODEL,
};
