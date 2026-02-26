import model from '../models/index.js';
import { PROJECT_MEMBER_ROLES } from '../middlewares/projectAccess.js';
import { createSystemLog, SYSTEM_LOG_ACTIONS } from '../services/systemLog.js';

const VALID_PROJECT_ROLES = Object.values(PROJECT_MEMBER_ROLES);

const parseProjectId = (req) => Number.parseInt(req.params.projectId, 10);

const canAssignRole = ({ targetUserRole, projectRole }) => {
  if (projectRole !== PROJECT_MEMBER_ROLES.SUPPORTER) {
    return true;
  }

  return targetUserRole === 'legislator';
};

const getMemberResponseAttributes = [
  'id',
  'projectId',
  'userId',
  'projectRole',
  'createdAt',
  'updatedAt',
];

export const getProjectMembers = async (req, res) => {
  try {
    const projectId = parseProjectId(req);

    const members = await model.ProjectMember.findAll({
      where: { projectId },
      attributes: getMemberResponseAttributes,
      include: [
        {
          model: model.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'imageUrl'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({ members });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const addProjectMember = async (req, res) => {
  const transaction = await model.sequelize.transaction();

  try {
    const projectId = parseProjectId(req);
    const { userId, projectRole } = req.body;

    if (!userId || !projectRole) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Missing required fields: userId and projectRole' });
    }

    if (!VALID_PROJECT_ROLES.includes(projectRole)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Invalid projectRole. Allowed roles: ${VALID_PROJECT_ROLES.join(', ')}` });
    }

    const [project, targetUser] = await Promise.all([
      model.Project.findByPk(projectId),
      model.User.findByPk(userId),
    ]);

    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!targetUser) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    if (!canAssignRole({ targetUserRole: targetUser.role, projectRole })) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only users with legislator role can be assigned as supporter' });
    }

    const existingMembership = await model.ProjectMember.findOne({
      where: {
        projectId,
        userId,
      },
      transaction,
    });

    if (existingMembership) {
      await transaction.rollback();
      return res.status(409).json({ message: 'User is already a member of this project' });
    }

    const member = await model.ProjectMember.create(
      {
        projectId,
        userId,
        projectRole,
      },
      { transaction },
    );

    await createSystemLog({
      performedBy: req.user.id,
      action: projectRole === PROJECT_MEMBER_ROLES.SUPPORTER ? SYSTEM_LOG_ACTIONS.SUPPORTER_ADDED : SYSTEM_LOG_ACTIONS.MEMBER_ADDED,
      metadata: {
        projectId,
        targetUserId: userId,
        projectRole,
      },
      transaction,
    });

    await transaction.commit();

    const responseMember = await model.ProjectMember.findByPk(member.id, {
      attributes: getMemberResponseAttributes,
      include: [
        {
          model: model.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'imageUrl'],
        },
      ],
    });

    return res.status(201).json({ member: responseMember });
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding project member:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const updateProjectMemberRole = async (req, res) => {
  const transaction = await model.sequelize.transaction();

  try {
    const projectId = parseProjectId(req);
    const memberId = Number.parseInt(req.params.memberId, 10);
    const { projectRole } = req.body;

    if (!projectRole) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Missing required field: projectRole' });
    }

    if (!VALID_PROJECT_ROLES.includes(projectRole)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Invalid projectRole. Allowed roles: ${VALID_PROJECT_ROLES.join(', ')}` });
    }

    const member = await model.ProjectMember.findOne({
      where: {
        id: memberId,
        projectId,
      },
      include: [
        {
          model: model.User,
          as: 'user',
          attributes: ['id', 'role'],
        },
      ],
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Member not found' });
    }

    if (!canAssignRole({ targetUserRole: member.user.role, projectRole })) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only users with legislator role can be assigned as supporter' });
    }

    const previousRole = member.projectRole;
    member.projectRole = projectRole;
    await member.save({ transaction });

    await createSystemLog({
      performedBy: req.user.id,
      action: SYSTEM_LOG_ACTIONS.MEMBER_ROLE_UPDATED,
      metadata: {
        projectId,
        memberId: member.id,
        targetUserId: member.userId,
        previousRole,
        newRole: projectRole,
      },
      transaction,
    });

    await transaction.commit();

    const responseMember = await model.ProjectMember.findByPk(member.id, {
      attributes: getMemberResponseAttributes,
      include: [
        {
          model: model.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'imageUrl'],
        },
      ],
    });

    return res.status(200).json({ member: responseMember });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating project member role:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const removeProjectMember = async (req, res) => {
  const transaction = await model.sequelize.transaction();

  try {
    const projectId = parseProjectId(req);
    const memberId = Number.parseInt(req.params.memberId, 10);

    const member = await model.ProjectMember.findOne({
      where: {
        id: memberId,
        projectId,
      },
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Member not found' });
    }

    await member.destroy({ transaction });

    await createSystemLog({
      performedBy: req.user.id,
      action: member.projectRole === PROJECT_MEMBER_ROLES.SUPPORTER ? SYSTEM_LOG_ACTIONS.SUPPORTER_REMOVED : SYSTEM_LOG_ACTIONS.MEMBER_REMOVED,
      metadata: {
        projectId,
        memberId,
        targetUserId: member.userId,
        previousRole: member.projectRole,
      },
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error removing project member:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const getProjectSupporters = async (req, res) => {
  try {
    const projectId = parseProjectId(req);

    const supporters = await model.ProjectMember.findAll({
      where: {
        projectId,
        projectRole: PROJECT_MEMBER_ROLES.SUPPORTER,
      },
      attributes: getMemberResponseAttributes,
      include: [
        {
          model: model.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'imageUrl'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({ supporters });
  } catch (error) {
    console.error('Error fetching project supporters:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const getProjectMemberCandidates = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const search = String(req.query.search || '').trim();
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 25);

    const userWhere = {
      disabled: false,
    };

    if (search.length > 0) {
      userWhere[model.Sequelize.Op.or] = [
        { firstName: { [model.Sequelize.Op.like]: `%${search}%` } },
        { lastName: { [model.Sequelize.Op.like]: `%${search}%` } },
        { email: { [model.Sequelize.Op.like]: `%${search}%` } },
      ];
    }

    const users = await model.User.findAll({
      where: userWhere,
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'imageUrl'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      limit,
    });

    const userIds = users.map((user) => user.id);

    const memberships = userIds.length > 0
      ? await model.ProjectMember.findAll({
        where: {
          projectId,
          userId: userIds,
        },
        attributes: ['id', 'userId', 'projectRole'],
      })
      : [];

    const membershipsByUserId = memberships.reduce((acc, membership) => {
      acc[membership.userId] = membership;
      return acc;
    }, {});

    const candidates = users.map((user) => {
      const membership = membershipsByUserId[user.id] || null;
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        imageUrl: user.imageUrl,
        alreadyMember: Boolean(membership),
        currentProjectRole: membership ? membership.projectRole : null,
      };
    });

    return res.status(200).json({ candidates });
  } catch (error) {
    console.error('Error fetching project member candidates:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};

export const addProjectSupporter = async (req, res) => {
  req.body.projectRole = PROJECT_MEMBER_ROLES.SUPPORTER;
  return addProjectMember(req, res);
};

export const removeProjectSupporter = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const userId = Number.parseInt(req.params.userId, 10);

    const member = await model.ProjectMember.findOne({
      where: {
        projectId,
        userId,
        projectRole: PROJECT_MEMBER_ROLES.SUPPORTER,
      },
      attributes: ['id'],
    });

    if (!member) {
      return res.status(404).json({ message: 'Supporter not found' });
    }

    req.params.memberId = String(member.id);
    return removeProjectMember(req, res);
  } catch (error) {
    console.error('Error removing project supporter:', error);
    return res.status(500).json({ message: 'There was an error' });
  }
};
