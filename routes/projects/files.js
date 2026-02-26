
import express from 'express';
import { check } from 'express-validator';
import * as projectFilesController from '../../controllers/projectFilesController.js';
import validate from '../../middlewares/validate.js';
import msg from '../../utils/messages.js';

// initialize router
const router = express.Router({mergeParams: true});

// -----------------------------------------------
// BASE   /projects/:projectId/files

// GET  /projects/:projectId/files/knowledge-base - List files in the project knowledge base, retrieving from S3
// -----------------------------------------------

router.use([check('projectId').isInt({ min: 1 }).withMessage(msg.validationError.integer)], validate);

router.get('/knowledge-base', projectFilesController.listProjectKnowledgeBaseFiles);

export default router;



