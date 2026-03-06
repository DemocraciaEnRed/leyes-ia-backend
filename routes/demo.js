import express from 'express';
import { check } from 'express-validator';
import * as demoController from '../controllers/demoController.js';
import demoMagicWord from '../middlewares/demoMagicWord.js';
import validate from '../middlewares/validate.js';
import msg from '../utils/messages.js';

const router = express.Router();

router.use(demoMagicWord);

router.post(
  '/create-user',
  [
    check('email').isEmail().withMessage(msg.validationError.email),
    check('firstName').not().isEmpty().withMessage(msg.validationError.firstName),
    check('lastName').not().isEmpty().withMessage(msg.validationError.lastName),
    check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.password),
    check('role').isIn(['user', 'legislator', 'admin']).withMessage(msg.validationError.role),
  ],
  validate,
  demoController.createDemoUser,
);

router.post(
  '/:projectId/encuesta/:surveyId',
  [
    check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
    check('surveyId').isInt({ min: 1 }).withMessage(msg.validationError.integer),
    check('count').isInt({ min: 1, max: 3000 }).withMessage(msg.validationError.integer),
  ],
  validate,
  demoController.generateSurveyResponses,
);

export default router;
