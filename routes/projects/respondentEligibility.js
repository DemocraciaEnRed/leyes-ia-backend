import express from 'express';
import { check } from 'express-validator';
import * as projectSurveyController from '../../controllers/projectSurveyController.js';
import authenticate from '../../middlewares/authenticate.js';
import requireSurveyRespondentProfile from '../../middlewares/requireSurveyRespondentProfile.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

const router = express.Router({ mergeParams: true });

router.get(
  '/:surveyId/respondent-eligibility',
  authenticate,
  [
    check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
    check('surveyId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
  ],
  validate,
  requireSurveyRespondentProfile,
  projectSurveyController.getSurveyRespondentEligibility,
);

export default router;
