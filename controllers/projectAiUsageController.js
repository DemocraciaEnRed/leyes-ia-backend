import { Op } from 'sequelize';
import model from '../models/index.js';

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const asNumber = (value) => Number(value || 0);

export const getProjectAiUsage = async (req, res) => {
  const projectId = Number.parseInt(req.params.projectId, 10);
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: 'Invalid projectId' });
  }

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = toDateOrNull(req.query.from) || defaultFrom;
  const to = toDateOrNull(req.query.to) || now;
  const action = req.query.action || null;
  const modelName = req.query.model || null;
  const status = req.query.status || null;
  const eventLimit = Math.min(toPositiveInt(req.query.limit, 30), 200);

  const where = {
    projectId,
    createdAt: {
      [Op.gte]: from,
      [Op.lte]: to,
    },
  };

  if (action) {
    where.action = action;
  }

  if (modelName) {
    where.model = modelName;
  }

  if (status) {
    where.status = status;
  }

  try {
    const [totalsRow, byActionRows, byModelRows, recentEvents] = await Promise.all([
      model.ProjectAiUsageEvent.findOne({
        where,
        attributes: [
          [model.sequelize.fn('COUNT', model.sequelize.col('id')), 'events'],
          [model.sequelize.fn('SUM', model.sequelize.col('inputTokens')), 'inputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('outputTokens')), 'outputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('totalTokens')), 'totalTokens'],
          [model.sequelize.fn('SUM', model.sequelize.literal("CASE WHEN status = 'success' THEN 1 ELSE 0 END")), 'successEvents'],
          [model.sequelize.fn('SUM', model.sequelize.literal("CASE WHEN status = 'error' THEN 1 ELSE 0 END")), 'errorEvents'],
        ],
        raw: true,
      }),
      model.ProjectAiUsageEvent.findAll({
        where,
        attributes: [
          'action',
          [model.sequelize.fn('COUNT', model.sequelize.col('id')), 'events'],
          [model.sequelize.fn('SUM', model.sequelize.col('inputTokens')), 'inputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('outputTokens')), 'outputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('totalTokens')), 'totalTokens'],
        ],
        group: ['action'],
        order: [[model.sequelize.literal('totalTokens'), 'DESC']],
        raw: true,
      }),
      model.ProjectAiUsageEvent.findAll({
        where,
        attributes: [
          'model',
          [model.sequelize.fn('COUNT', model.sequelize.col('id')), 'events'],
          [model.sequelize.fn('SUM', model.sequelize.col('inputTokens')), 'inputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('outputTokens')), 'outputTokens'],
          [model.sequelize.fn('SUM', model.sequelize.col('totalTokens')), 'totalTokens'],
        ],
        group: ['model'],
        order: [[model.sequelize.literal('totalTokens'), 'DESC']],
        raw: true,
      }),
      model.ProjectAiUsageEvent.findAll({
        where,
        include: [
          {
            model: model.User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: eventLimit,
      }),
    ]);

    return res.status(200).json({
      filters: {
        from: from.toISOString(),
        to: to.toISOString(),
        action,
        model: modelName,
        status,
      },
      totals: {
        events: asNumber(totalsRow?.events),
        inputTokens: asNumber(totalsRow?.inputTokens),
        outputTokens: asNumber(totalsRow?.outputTokens),
        totalTokens: asNumber(totalsRow?.totalTokens),
        successEvents: asNumber(totalsRow?.successEvents),
        errorEvents: asNumber(totalsRow?.errorEvents),
      },
      byAction: byActionRows.map((row) => ({
        action: row.action,
        events: asNumber(row.events),
        inputTokens: asNumber(row.inputTokens),
        outputTokens: asNumber(row.outputTokens),
        totalTokens: asNumber(row.totalTokens),
      })),
      byModel: byModelRows.map((row) => ({
        model: row.model,
        events: asNumber(row.events),
        inputTokens: asNumber(row.inputTokens),
        outputTokens: asNumber(row.outputTokens),
        totalTokens: asNumber(row.totalTokens),
      })),
      recentEvents,
    });
  } catch (error) {
    console.error('Error fetching project ai usage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getProjectAiUsage,
};
