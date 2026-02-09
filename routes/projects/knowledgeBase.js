
import express from 'express';
import * as projectKnowledgeBaseController from '../../controllers/projectKnowledgeBaseController.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/knowledge-base

// GET  /projects/:projectId/knowledge-base/ready - Check if the project knowledge base is ready
// GET  /projects/:projectId/knowledge-base/status - Get the status of the project knowledge base
// POST /projects/:projectId/knowledge-base/retrieve - Retrieve information from the project knowledge base

// -----------------------------------------------
router.get('/status', projectKnowledgeBaseController.getStatusProjectKnowledgeBase);
router.get('/ready', projectKnowledgeBaseController.checkProjectKnowledgeBaseReady);
router.post('/retrieve', projectKnowledgeBaseController.retrieveProjectKnowledgeBase);

export default router;

