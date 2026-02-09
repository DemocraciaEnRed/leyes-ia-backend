import express from 'express';
import { check } from 'express-validator';

import validate from '../middlewares/validate.js';
import authorize from '../middlewares/authorize.js';
import requiresAnon from '../middlewares/requiresAnon.js';

import * as AuthController from '../controllers/authController.js';
import msg from '../utils/messages.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE     /auth
// -----------------------------------------------
// POST 	/auth/signup
// POST 	/auth/login
// POST 	/auth/refresh-token
// GET  	/auth/verify/:token
// POST 	/auth/resend
// POST 	/auth/forgot
// POST 	/auth/reset/:token
// GET  	/auth/session
// POST 	/auth/logout
// GET  	/auth/logged
// -----------------------------------------------


router.post('/signup', 
	requiresAnon,
	[
    check('email').isEmail().withMessage(msg.validationError.email),
		check('firstName').not().isEmpty().withMessage(msg.validationError.invalidValue),
		check('lastName').not().isEmpty().withMessage(msg.validationError.invalidValue),
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.invalidValue),
		check('magicWord').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
	], 
	validate,
	AuthController.register
);

router.post("/login",
	requiresAnon,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.invalidValues),
	],
	validate,
	AuthController.login
);

router.post('/refresh-token',
	authorize(),
	AuthController.refreshToken
);

router.get('/verify/:token',
	[
		check('token').not().isEmpty().withMessage(msg.validationError.token),
	],
	validate,
	AuthController.verify
);

router.post('/resend', 
	requiresAnon,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
	],
	validate,
	AuthController.resendToken
);

router.post('/forgot', 
	requiresAnon,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
	],
	validate,
	AuthController.forgot
);


router.post('/reset/:token',
	requiresAnon,
	[
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.password),
	],
	validate,
	AuthController.resetPassword
);

router.get('/session',
	
	AuthController.getSession
);

router.post('/logout',
	AuthController.logout
);

router.get('/logged',
	AuthController.loggedIn
);

export default router;