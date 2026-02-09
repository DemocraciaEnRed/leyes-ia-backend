
import express from 'express';
import * as projectFilesController from '../../controllers/projectFilesController.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/files

// GET  /projects/:projectId/files/knowledge-base - List files in the project knowledge base, retrieving from S3
// -----------------------------------------------

router.get('/knowledge-base', projectFilesController.listProjectKnowledgeBaseFiles);

export default router;



