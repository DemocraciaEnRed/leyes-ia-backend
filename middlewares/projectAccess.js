import model from '../models/index.js';

export const PROJECT_ACCESS_ROLES = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  SUPPORTER: 'supporter',
});

export const PROJECT_MEMBER_ROLES = Object.freeze({
  MANAGER: PROJECT_ACCESS_ROLES.MANAGER,
  SUPPORTER: PROJECT_ACCESS_ROLES.SUPPORTER,
});

const ALL_PROJECT_ACCESS_ROLES = Object.values(PROJECT_ACCESS_ROLES);

const unauthorized = (res, message = 'Authentication required') => {
  return res.status(401).json({ message });
};

const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ message });
};

export const getProjectMembership = async ({ projectId, userId }) => {
  if (!projectId || !userId) {
    return null;
  }

  return model.ProjectMember.findOne({
    where: {
      projectId,
      userId,
    },
  });
};

const getProjectAccessRole = ({ project, membership, userId }) => {
  if (!project) {
    return null;
  }

  if (project.projectOwnerId === userId) {
    return PROJECT_ACCESS_ROLES.OWNER;
  }

  return membership?.projectRole || null;
};

export const requireProjectAccess = ({ allowedProjectRoles = ALL_PROJECT_ACCESS_ROLES } = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res);
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const { projectId } = req.params;
      const [project, membership] = await Promise.all([
        model.Project.findByPk(projectId, {
          attributes: ['id', 'projectOwnerId'],
        }),
        getProjectMembership({
          projectId,
          userId: req.user.id,
        }),
      ]);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const accessRole = getProjectAccessRole({
        project,
        membership,
        userId: req.user.id,
      });

      if (!accessRole) {
        return forbidden(res, 'Forbidden: You are not a member of this project');
      }

      if (!allowedProjectRoles.includes(accessRole)) {
        return forbidden(res, 'Forbidden: You do not have enough permissions for this project');
      }

      req.projectMembership = membership || null;
      req.projectAccessRole = accessRole;
      return next();
    } catch (error) {
      console.error('projectAccess middleware error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
};

export const requireProjectViewAccess = requireProjectAccess({
  allowedProjectRoles: [PROJECT_ACCESS_ROLES.OWNER, PROJECT_ACCESS_ROLES.MANAGER, PROJECT_ACCESS_ROLES.SUPPORTER],
});

export const requireProjectEditAccess = requireProjectAccess({
  allowedProjectRoles: [PROJECT_ACCESS_ROLES.OWNER, PROJECT_ACCESS_ROLES.MANAGER],
});
