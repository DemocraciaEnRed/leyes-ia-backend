import express from 'express';
import * as knowledgeBasesController from '../controllers/knowledgeBasesController.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /knowledge-bases

// GET  /knowledge-bases/ - Get all knowledge bases
// GET  /knowledge-bases/:id - Get knowledge base by ID (from database, not uuid from Digital Ocean's Gradient)
// -----------------------------------------------

router.get('/', knowledgeBasesController.getKnowledgeBases);
router.get('/:id', knowledgeBasesController.getKnowledgeBaseById);

export default router;

