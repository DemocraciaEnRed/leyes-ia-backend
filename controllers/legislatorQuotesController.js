import model from '../models/index.js';
import { Op } from 'sequelize';
import * as legislatorQuotesService from '../services/legislatorQuotes.js';
import { AI_USAGE_ACTIONS, recordProjectAiUsageEvent } from '../services/aiUsageAudit.js';

const GEMINI_MODEL = legislatorQuotesService.GEMINI_MODEL;

export const searchQuotes = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { legislatorIds, dateRangeStart, dateRangeEnd, forceRegenerate } = req.body;

    // Fetch project with needed fields
    const project = await model.Project.findByPk(projectId, {
      attributes: ['id', 'name', 'title', 'description', 'summary', 'category'],
    });

    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    // Fetch legislators with Province
    const legislators = await model.Legislator.findAll({
      where: {
        id: { [Op.in]: legislatorIds },
        active: true,
      },
      include: [{ model: model.Province, as: 'province', attributes: ['id', 'name'] }],
    });

    if (legislators.length === 0) {
      return res.status(400).json({ message: 'No se encontraron legisladores activos con los IDs proporcionados.' });
    }

    const foundIds = legislators.map(l => l.id);
    const missingIds = legislatorIds.filter(id => !foundIds.includes(id));
    if (missingIds.length > 0) {
      return res.status(400).json({ message: `Legisladores no encontrados o inactivos: ${missingIds.join(', ')}` });
    }

    // Check cache for each legislator (unless forceRegenerate)
    let cachedMap = new Map();
    if (!forceRegenerate) {
      cachedMap = await legislatorQuotesService.findCachedResults({
        projectId,
        legislatorIds,
        dateRangeStart: dateRangeStart || null,
        dateRangeEnd: dateRangeEnd || null,
      });
    }

    const cachedResults = [];
    const uncachedLegislators = [];

    for (const legislator of legislators) {
      const cached = cachedMap.get(legislator.id);
      if (cached) {
        cachedResults.push({
          legislatorId: legislator.id,
          legislatorName: `${legislator.firstName} ${legislator.lastName}`,
          found: cached.found,
          summary: cached.result?.summary || '',
          stance: cached.stance,
          quotes: cached.result?.quotes || [],
          cached: true,
          searchId: cached.id,
        });
      } else {
        uncachedLegislators.push(legislator);
      }
    }

    let newResults = [];
    let usage = null;

    if (uncachedLegislators.length > 0) {
      const dateRange = {
        start: dateRangeStart || null,
        end: dateRangeEnd || null,
      };

      const startedAt = Date.now();

      try {
        const { results: geminiResults, groundingSources, geminiResponse } = await legislatorQuotesService.searchQuotes({
          project,
          legislators: uncachedLegislators,
          dateRange,
        });

        const latencyMs = Date.now() - startedAt;

        // Persist results per legislator
        const records = await legislatorQuotesService.persistResults({
          projectId,
          userId: req.user?.id,
          legislatorResults: geminiResults,
          dateRangeStart: dateRangeStart || null,
          dateRangeEnd: dateRangeEnd || null,
          geminiModel: GEMINI_MODEL,
          geminiResponse,
          latencyMs,
          groundingSources,
        });

        // Record AI usage audit
        await recordProjectAiUsageEvent({
          projectId,
          userId: req.user?.id,
          action: AI_USAGE_ACTIONS.LEGISLATOR_QUOTES_SEARCH,
          model: GEMINI_MODEL,
          status: 'success',
          geminiResponse,
          latencyMs,
          metadata: {
            route: req.originalUrl,
            legislatorIds: uncachedLegislators.map(l => l.id),
            dateRangeStart,
            dateRangeEnd,
          },
        });

        for (const result of geminiResults) {
          const record = records.find(r => r.legislatorId === result.legislatorId);
          newResults.push({
            legislatorId: result.legislatorId,
            legislatorName: result.legislatorName,
            found: result.found,
            summary: result.summary,
            stance: result.stance,
            quotes: result.quotes || [],
            cached: false,
            searchId: record?.id || null,
          });
        }

        const { extractGeminiUsage } = await import('../services/aiUsageAudit.js');
        const usageData = extractGeminiUsage(geminiResponse);
        usage = {
          model: GEMINI_MODEL,
          totalTokens: usageData.totalTokens,
          latencyMs,
        };
      } catch (error) {
        const latencyMs = Date.now() - startedAt;

        await recordProjectAiUsageEvent({
          projectId,
          userId: req.user?.id,
          action: AI_USAGE_ACTIONS.LEGISLATOR_QUOTES_SEARCH,
          model: GEMINI_MODEL,
          status: 'error',
          latencyMs,
          errorMessage: error?.message || 'Unknown error',
          metadata: {
            route: req.originalUrl,
            legislatorIds: uncachedLegislators.map(l => l.id),
          },
        });

        return res.status(500).json({
          message: 'Error al buscar citas de legisladores.',
          error: error?.message || 'Unknown error',
        });
      }
    }

    // Combine cached + new results, sorted by original legislatorIds order
    const allResults = [...cachedResults, ...newResults];
    allResults.sort((a, b) => legislatorIds.indexOf(a.legislatorId) - legislatorIds.indexOf(b.legislatorId));

    return res.json({
      results: allResults,
      usage,
    });
  } catch (error) {
    console.error('[legislator-quotes] searchQuotes error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export const getResults = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const legislatorId = req.query.legislatorId ? parseInt(req.query.legislatorId, 10) : null;

    const results = await legislatorQuotesService.getProjectQuoteSearches({ projectId, legislatorId });

    return res.json({ results });
  } catch (error) {
    console.error('[legislator-quotes] getResults error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export const getPublicResults = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const legislatorId = req.query.legislatorId ? parseInt(req.query.legislatorId, 10) : null;

    const results = await legislatorQuotesService.getPublicProjectQuoteSearches({ projectSlug, legislatorId });

    if (results === null) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no publicado.' });
    }

    return res.json({ results });
  } catch (error) {
    console.error('[legislator-quotes] getPublicResults error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
