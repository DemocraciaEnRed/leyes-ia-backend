import express from 'express';
import model from '../models/index.js';
import * as utilsController from '../controllers/utilsController.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /utils
// -----------------------------------------------

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Service is healthy' });
});

router.get('/check-opensearch', utilsController.checkOpenSearch);

export default router;
