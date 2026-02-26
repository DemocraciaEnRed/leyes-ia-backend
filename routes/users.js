import express from 'express';

import authorize from '../middlewares/authorize.js';
import authenticate from '../middlewares/authenticate.js';

import * as UserController from '../controllers/userController.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE     /users
// -----------------------------------------------
// GET      /users/me/profile
// PATCH    /users/me/profile
// -----------------------------------------------

router.get('/me/profile',
	authenticate,
	authorize(),
	UserController.getProfile
);

router.patch('/me/profile',
	authenticate,
	authorize(),
	UserController.updateProfile
);

export default router;
