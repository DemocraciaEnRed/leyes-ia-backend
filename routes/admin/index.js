import express from 'express';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';
import * as projectAiUsageController from '../../controllers/projectAiUsageController.js';
import legislatorRoutes from './legislators.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /admin
// -----------------------------------------------

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

router.get('/ai-usage', projectAiUsageController.getProjectAiUsage);
router.use('/legislators', legislatorRoutes);

export default router;
