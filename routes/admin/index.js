import express from 'express';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';
import * as projectAiUsageController from '../../controllers/projectAiUsageController.js';
import legislatorRoutes from './legislators.js';
import politicalPartyRoutes from './politicalParties.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /admin
// -----------------------------------------------

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

router.get('/ai-usage', projectAiUsageController.getProjectAiUsage);
router.use('/legislators', legislatorRoutes);
router.use('/political-parties', politicalPartyRoutes);

export default router;
