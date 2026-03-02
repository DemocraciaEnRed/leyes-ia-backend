import express from 'express';
import * as projectController from '../../controllers/projectController.js';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /hub/projects
// Public Hub routes (citizen-facing)
// All endpoints here must expose only published projects.
// -----------------------------------------------

router.get('/', projectController.getProjects);
router.get('/categories', projectController.getProjectCategories);
router.get('/latest-published', projectController.getLatestPublishedProjects);
router.get('/slug/:projectSlug', projectController.getPublishedProjectBySlug);
router.get('/slug/:projectSlug/featured-survey', projectSurveyController.getPublicFeaturedSurveyByProjectSlug);
router.get('/slug/:projectSlug/available-surveys', projectSurveyController.getPublicAvailableSurveysByProjectSlug);

export default router;
