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

router.post(
  '/:surveyId/responses',
  authenticate,
  [
    check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
    check('surveyId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
    check('answers').custom((value) => {
      return value !== undefined && value !== null && typeof value === 'object';
    }).withMessage(msg.validationError.invalidValue),
    check('respondentData').optional({ nullable: true }).isObject().withMessage(msg.validationError.invalidValue),
    check('dateOfBirth').optional({ nullable: true }).isISO8601().withMessage(msg.validationError.date),
    check('genre').optional({ nullable: true }).isString().withMessage(msg.validationError.string),
    check('provinceId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg.validationError.integer),
  ],
  validate,
  projectSurveyController.submitProjectSurveyResponse,
);

export default router;
