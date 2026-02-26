import express from 'express';
import { check } from 'express-validator';
import * as projectController from '../../controllers/projectController.js';
import upload from '../../services/multer.js';
import projectManageRouter from './manage.js';
import projectRespondentEligibilityRouter from './respondentEligibility.js';
import authenticate from '../../middlewares/authenticate.js';
import { requireProjectViewAccess } from '../../middlewares/projectAccess.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /projects

// POST   /projects - Initialize a new project with up to 3 PDF files 
// ROUTER /projects/:projectId/manage - Project management routes (dashboard/admin)

// -----------------------------------------------
router.get('/', authenticate, projectController.getProjects);
router.post('/', authenticate, upload.single('projectPdf'), [
	check('name').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
	check('slug').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
	check('authorFullname').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
], validate, projectController.createProject);

// Public (non-manage) survey respondent eligibility path for authenticated users.
router.use('/:projectId/surveys', projectRespondentEligibilityRouter);

// Segmented management surface.
router.use('/:projectId/manage', authenticate, requireProjectViewAccess, projectManageRouter);

export default router;