
import express from 'express';
import { check } from 'express-validator';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';
import { requireProjectEditAccess } from '../../middlewares/projectAccess.js';
import requireSurveyRespondentProfile from '../../middlewares/requireSurveyRespondentProfile.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

// initialize router
const router = express.Router({mergeParams: true});
const projectIdValidation = [check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer), validate];
const surveyIdValidation = [check('surveyId').isInt({ min: 1 }).withMessage(msg.validationError.integer), validate];

// -----------------------------------------------
// BASE   /projects/:projectId/survey

// POST /projects/:projectId/survey/generate - Generate project survey
// POST /projects/:projectId/survey/regenerate - Regenerate project survey

// -----------------------------------------------
router.use(projectIdValidation);

router.post('/', requireProjectEditAccess, [
	check('surveyTitle').optional().isString().withMessage(msg.validationError.string),
	check('questions').optional().isArray().withMessage(msg.validationError.invalidValue),
], validate, projectSurveyController.saveProjectSurvey);
router.patch('/:surveyId', surveyIdValidation, requireProjectEditAccess, [
	check('surveyTitle').optional().isString().withMessage(msg.validationError.string),
	check('surveyAbout').optional({ nullable: true }).isString().withMessage(msg.validationError.string),
	check('surveyType').optional().isString().withMessage(msg.validationError.string),
	check('surveyPublic').optional().isBoolean().withMessage(msg.validationError.invalidValue),
	check('surveyVisible').optional().isBoolean().withMessage(msg.validationError.invalidValue),
	check('allowAnonymousResponses').optional().isBoolean().withMessage(msg.validationError.invalidValue),
	check('surveyWelcomeTitle').optional().isString().withMessage(msg.validationError.string),
	check('surveyWelcomeSubtitle').optional({ nullable: true }).isString().withMessage(msg.validationError.string),
	check('surveyClosedAt').optional({ nullable: true }).isISO8601().withMessage(msg.validationError.date),
	check('questions').optional().isArray().withMessage(msg.validationError.invalidValue),
	check('surveyJsonSchema').optional({ nullable: true }).isObject().withMessage(msg.validationError.invalidValue),
], validate, projectSurveyController.updateProjectSurvey);
router.get('/', projectSurveyController.getProjectSurveys);
router.post('/generate', requireProjectEditAccess, [
	check('surveyRequiredQuestions').isArray().withMessage(msg.validationError.invalidValue),
	check('surveyQuestionCount').optional().isInt({ min: 5, max: 25 }).withMessage(msg.validationError.limit),
], validate, projectSurveyController.generateProjectSurvey);
router.post('/regenerate', requireProjectEditAccess, [
	check('userPromptForEdits').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
	check('originalSurvey').not().isEmpty().isObject().withMessage(msg.validationError.invalidValue),
	check('surveyRequiredQuestions').optional().isArray().withMessage(msg.validationError.invalidValue),
], validate, projectSurveyController.regenerateProjectSurvey);
router.post('/generate-base', requireProjectEditAccess, projectSurveyController.generateBaseSurvey);

router.post('/:surveyId/featured', surveyIdValidation, requireProjectEditAccess, projectSurveyController.setProjectFeaturedSurvey);
router.delete('/featured', requireProjectEditAccess, projectSurveyController.clearProjectFeaturedSurvey);

router.get('/:surveyId', surveyIdValidation, projectSurveyController.getProjectSurveyById);
router.get('/:surveyId/respondent-eligibility', surveyIdValidation, requireSurveyRespondentProfile, projectSurveyController.getSurveyRespondentEligibility);

export default router;

