import express from 'express';
import * as projectController from '../../controllers/projectController.js';

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

export default router;
