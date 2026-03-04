import express from 'express';
import model from '../models/index.js';
import * as utilsController from '../controllers/utilsController.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /utils
// -----------------------------------------------

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Service is healthy' });
});

router.get('/provinces', utilsController.getProvinces);

router.get('/check-opensearch', authenticate, authorize('admin'), utilsController.checkOpenSearch);

export default router;
