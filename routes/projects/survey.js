
import express from 'express';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/survey

// POST /projects/:projectId/survey/generate - Generate project survey
// POST /projects/:projectId/survey/regenerate - Regenerate project survey

// -----------------------------------------------
router.post('/generate', projectSurveyController.generateProjectSurvey);
router.post('/regenerate', projectSurveyController.regenerateProjectSurvey);
router.post('/save', projectSurveyController.saveProjectSurvey);
router.get('/', projectSurveyController.getProjectSurveys);

export default router;

