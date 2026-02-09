
import express from 'express';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';
import authenticate from '../../middlewares/authenticate.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/survey

// POST /projects/:projectId/survey/generate - Generate project survey
// POST /projects/:projectId/survey/regenerate - Regenerate project survey

// -----------------------------------------------
router.post('/', authenticate, projectSurveyController.saveProjectSurvey);
router.get('/', projectSurveyController.getProjectSurveys);
router.post('/generate', authenticate, projectSurveyController.generateProjectSurvey);
router.post('/regenerate', authenticate, projectSurveyController.regenerateProjectSurvey);
router.post('/generate-base', authenticate, projectSurveyController.generateBaseSurvey);

router.get('/:surveyId', projectSurveyController.getProjectSurveyById);

export default router;

