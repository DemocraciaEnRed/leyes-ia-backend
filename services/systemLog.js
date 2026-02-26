import model from '../models/index.js';

export const SYSTEM_LOG_ACTIONS = Object.freeze({
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_PUBLISHED: 'project_published',
  PROJECT_UNPUBLISHED: 'project_unpublished',
  MEMBER_ADDED: 'member_added',
  MEMBER_ROLE_UPDATED: 'member_role_updated',
  MEMBER_REMOVED: 'member_removed',
  SUPPORTER_ADDED: 'supporter_added',
  SUPPORTER_REMOVED: 'supporter_removed',
});

export const createSystemLog = async ({ performedBy, action, metadata = null, transaction } = {}) => {
  if (!performedBy || !action) {
    return null;
  }

  return model.SystemLog.create(
    {
      performedBy,
      action,
      metadata,
    },
    transaction ? { transaction } : undefined,
  );
};

export default {
  createSystemLog,
  SYSTEM_LOG_ACTIONS,
};
