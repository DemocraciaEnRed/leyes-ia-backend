import express from 'express';
import * as projectController from '../../controllers/projectController.js';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';
import * as legislatorQuotesController from '../../controllers/legislatorQuotesController.js';
import * as votePredictionController from '../../controllers/votePredictionController.js';
import * as voteResultController from '../../controllers/voteResultController.js';
import authenticate from '../../middlewares/authenticate.js';

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
router.get('/slug/:projectSlug/surveys/:surveyId', projectSurveyController.getPublicSurveyByProjectSlugAndSurveyId);
router.get('/slug/:projectSlug/surveys/:surveyId/results', projectSurveyController.getPublicSurveyResultsByProjectSlugAndSurveyId);
router.get('/slug/:projectSlug/surveys/:surveyId/respondent-eligibility', authenticate, projectSurveyController.getPublicSurveyRespondentEligibilityByProjectSlugAndSurveyId);
router.get('/slug/:projectSlug/legislator-quotes', legislatorQuotesController.getPublicResults);
router.get('/slug/:projectSlug/vote-predictions', votePredictionController.getPublicPredictions);
router.get('/slug/:projectSlug/vote-result', voteResultController.getPublicResult);

export default router;
