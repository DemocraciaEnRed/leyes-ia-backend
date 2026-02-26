import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as projectAiUsageController from '../controllers/projectAiUsageController.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /admin
// -----------------------------------------------

router.get('/ai-usage', authenticate, authorize('admin'), projectAiUsageController.getProjectAiUsage);

export default router;
