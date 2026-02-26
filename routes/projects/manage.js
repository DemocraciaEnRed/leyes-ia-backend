import express from 'express';
import { check } from 'express-validator';
import * as projectController from '../../controllers/projectController.js';
import * as projectMembersController from '../../controllers/projectMembersController.js';
import * as projectAiUsageController from '../../controllers/projectAiUsageController.js';
import projectKnowledgeBaseRouter from './knowledgeBase.js';
import projectSurveyRouter from './surveys.js';
import projectFilesRouter from './files.js';
import { requireProjectEditAccess } from '../../middlewares/projectAccess.js';
import authorize from '../../middlewares/authorize.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

const router = express.Router({ mergeParams: true });
const projectIdValidation = [check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer), validate];
const projectMemberRoleValidation = check('projectRole').isIn(['manager', 'supporter']).withMessage(msg.validationError.invalidValue);

// -----------------------------------------------
// BASE   /projects/:projectId/manage
// Project management routes (dashboard/admin)
// Parent router is expected to enforce:
// - authenticate
// - requireProjectViewAccess
// -----------------------------------------------

router.use(projectIdValidation);

router.get('/', projectController.getProjectById);

router.put('/fields', requireProjectEditAccess, projectController.putSaveProjectFields);
router.post('/fields/generate', requireProjectEditAccess, projectController.postGenerateProjectFields);
router.post('/fields/regenerate', requireProjectEditAccess, projectController.postRegenerateProjectFields);

router.post('/publish', requireProjectEditAccess, projectController.postPublishProject);
router.post('/unpublish', requireProjectEditAccess, projectController.postUnpublishProject);
router.patch('/owner', authorize('admin'), [check('projectOwnerId').isInt({ min: 1 }).withMessage(msg.validationError.integer)], validate, projectController.patchProjectOwner);
router.get('/ai-usage', projectAiUsageController.getProjectAiUsage);

router.get('/members', projectMembersController.getProjectMembers);
router.get('/member-candidates', requireProjectEditAccess, [
	check('search').optional().isString().withMessage(msg.validationError.string),
	check('limit').optional().isInt({ min: 1, max: 25 }).withMessage(msg.validationError.limit),
], validate, projectMembersController.getProjectMemberCandidates);
router.post('/members', requireProjectEditAccess, [
	check('userId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
	projectMemberRoleValidation,
], validate, projectMembersController.addProjectMember);
router.patch('/members/:memberId', requireProjectEditAccess, [
	check('memberId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
	projectMemberRoleValidation,
], validate, projectMembersController.updateProjectMemberRole);
router.delete('/members/:memberId', requireProjectEditAccess, [
	check('memberId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
], validate, projectMembersController.removeProjectMember);

router.get('/supporters', projectMembersController.getProjectSupporters);
router.post('/supporters', requireProjectEditAccess, projectMembersController.addProjectSupporter);
router.delete('/supporters/:userId', requireProjectEditAccess, [
	check('userId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
], validate, projectMembersController.removeProjectSupporter);

router.use('/files', projectFilesRouter);
router.use('/knowledge-base', projectKnowledgeBaseRouter);
router.use('/surveys', projectSurveyRouter);

export default router;
