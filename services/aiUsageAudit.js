import model from '../models/index.js';

export const AI_USAGE_ACTIONS = Object.freeze({
  PROJECT_FIELDS_GENERATE: 'project_fields_generate',
  PROJECT_FIELDS_REGENERATE: 'project_fields_regenerate',
  SURVEY_GENERATE_BASE: 'survey_generate_base',
  SURVEY_GENERATE: 'survey_generate',
  SURVEY_REGENERATE: 'survey_regenerate',
});

const snakeCasePattern = /^[a-z]+(?:_[a-z0-9]+)*$/;

const toNullableInteger = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.round(parsed));
};

export const extractGeminiUsage = (geminiResponse) => {
  const usageMetadata =
    geminiResponse?.usageMetadata ||
    geminiResponse?.response?.usageMetadata ||
    geminiResponse?.data?.usageMetadata ||
    null;

  return {
    inputTokens: toNullableInteger(usageMetadata?.promptTokenCount),
    outputTokens: toNullableInteger(usageMetadata?.candidatesTokenCount),
    totalTokens: toNullableInteger(usageMetadata?.totalTokenCount),
    rawUsage: usageMetadata,
  };
};

export const recordProjectAiUsageEvent = async ({
  projectId,
  userId,
  action,
  model: modelName,
  status = 'success',
  geminiResponse,
  latencyMs,
  errorMessage,
  metadata,
  transaction,
} = {}) => {
  if (!projectId || !action) {
    return null;
  }

  if (!snakeCasePattern.test(action)) {
    console.warn('[ai-usage-audit] invalid action format, expected snake_case:', action);
  }

  const usage = extractGeminiUsage(geminiResponse);

  const payload = {
    projectId,
    userId: userId || null,
    action,
    model: modelName || null,
    status,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    latencyMs: toNullableInteger(latencyMs),
    errorMessage: errorMessage || null,
    metadata: metadata || null,
    rawUsage: usage.rawUsage || null,
  };

  try {
    return await model.ProjectAiUsageEvent.create(
      payload,
      transaction ? { transaction } : undefined,
    );
  } catch (error) {
    console.error('[ai-usage-audit] Failed to persist event:', error);
    return null;
  }
};

export default {
  AI_USAGE_ACTIONS,
  extractGeminiUsage,
  recordProjectAiUsageEvent,
};
