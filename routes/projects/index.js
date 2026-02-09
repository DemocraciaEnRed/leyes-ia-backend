import express from 'express';
import * as projectController from '../../controllers/projectController.js';
import upload from '../../services/multer.js';
import projectKnowledgeBaseRouter from './knowledgeBase.js';
import projectSurveyRouter from './surveys.js';
import projectFilesRouter from './files.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /projects

// POST   /projects - Initialize a new project with up to 3 PDF files 
// POST   /projects/:projectId/generate-fields - Generate missing project fields based on uploaded PDF content
// ROUTER /projects/:projectId/knowledge-base - Project Knowledge Base routes

// -----------------------------------------------
router.get('/', projectController.getProjects);
router.post('/', upload.single('projectPdf'), projectController.createProject);
router.get('/categories', projectController.getProjectCategories);
router.get('/:projectId', projectController.getProjectById);
router.put('/:projectId/save-fields', projectController.putSaveProjectFields);
router.post('/:projectId/generate-fields', projectController.postGenerateProjectFields);
router.post('/:projectId/regenerate-fields', projectController.postRegenerateProjectFields);
router.post('/:projectId/publish', projectController.postPublishProject);
router.post('/:projectId/unpublish', projectController.postUnpublishProject);

// -----------------------------------------------

router.use('/:projectId/files', projectFilesRouter);
router.use('/:projectId/knowledge-base', projectKnowledgeBaseRouter)
router.use('/:projectId/surveys', projectSurveyRouter);

export default router;