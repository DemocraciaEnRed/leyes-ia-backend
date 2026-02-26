
import express from 'express';
import { check } from 'express-validator';
import * as projectKnowledgeBaseController from '../../controllers/projectKnowledgeBaseController.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/knowledge-base

// GET  /projects/:projectId/knowledge-base/ready - Check if the project knowledge base is ready
// GET  /projects/:projectId/knowledge-base/status - Get the status of the project knowledge base
// POST /projects/:projectId/knowledge-base/retrieve - Retrieve information from the project knowledge base

// -----------------------------------------------
router.use([check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer)], validate);

router.get('/status', projectKnowledgeBaseController.getStatusProjectKnowledgeBase);
router.get('/ready', projectKnowledgeBaseController.checkProjectKnowledgeBaseReady);
router.post('/retrieve', [
	check('query').not().isEmpty().isString().withMessage(msg.validationError.query),
], validate, projectKnowledgeBaseController.retrieveProjectKnowledgeBase);

export default router;

