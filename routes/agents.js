import express from 'express';
import * as agentController from '../controllers/agentController.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /agents
// -----------------------------------------------

router.get('/', agentController.getAgents);
router.get('/:id', agentController.getAgentById);

export default router;

