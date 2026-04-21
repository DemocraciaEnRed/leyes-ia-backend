import express from 'express';
import { check } from 'express-validator';
import * as projectController from '../../controllers/projectController.js';
import * as projectMembersController from '../../controllers/projectMembersController.js';
import * as projectAiUsageController from '../../controllers/projectAiUsageController.js';
import * as legislatorQuotesController from '../../controllers/legislatorQuotesController.js';
import * as votePredictionController from '../../controllers/votePredictionController.js';
import * as voteResultController from '../../controllers/voteResultController.js';
import upload from '../../services/multer.js';
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

router.get('/legislator-quotes', legislatorQuotesController.getResults);
router.post('/legislator-quotes', requireProjectEditAccess, [
	check('legislatorIds')
		.isArray({ min: 1, max: 5 }).withMessage('Debe seleccionar entre 1 y 5 legisladores.'),
	check('legislatorIds.*')
		.isInt({ min: 1 }).withMessage(msg.validationError.integer),
	check('dateRangeStart')
		.optional({ values: 'null' }).isISO8601().withMessage(msg.validationError.date),
	check('dateRangeEnd')
		.optional({ values: 'null' }).isISO8601().withMessage(msg.validationError.date),
	check('forceRegenerate')
		.optional().isBoolean().withMessage(msg.validationError.boolean),
], validate, legislatorQuotesController.searchQuotes);

// Vote predictions
router.get('/vote-predictions', votePredictionController.listPredictions);
router.post('/vote-predictions/generate', requireProjectEditAccess, votePredictionController.generateTheoretical);
router.post('/vote-predictions/:predictionId/generate-contextual', requireProjectEditAccess, [
	check('predictionId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
	check('dateFrom').optional({ values: 'null' }).isISO8601().withMessage(msg.validationError.date),
	check('dateTo').optional({ values: 'null' }).isISO8601().withMessage(msg.validationError.date),
], validate, votePredictionController.generateContextual);
router.post('/vote-predictions/regenerate', requireProjectEditAccess, votePredictionController.regenerateAll);

// Vote results
router.get('/vote-result', voteResultController.getResult);
router.post('/vote-result/upload-acta', requireProjectEditAccess, upload.single('actaFile'), [
	check('sourceUrl').optional({ values: 'null' }).isURL().withMessage('La URL no es válida'),
], validate, voteResultController.uploadActa);

export default router;
