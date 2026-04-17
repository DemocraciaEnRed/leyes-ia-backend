import express from 'express';
import authenticate from '../../middlewares/authenticate.js';
import * as legislatorController from '../../controllers/legislatorController.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /legislators
// -----------------------------------------------
// Public/authenticated endpoint for legislator selectors

router.get('/', authenticate, legislatorController.listPublic);

export default router;
