import express from 'express';
import { check } from 'express-validator';

import validate from '../middlewares/validate.js';
import authorize from '../middlewares/authorize.js';
import authenticate from '../middlewares/authenticate.js';
import requiresAnon from '../middlewares/requiresAnon.js';

import * as AuthController from '../controllers/authController.js';
import msg from '../utils/messages.js';

// initialize router
const router = express.Router();
const requiresAnonymous = [authenticate, requiresAnon];
const ALLOWED_GENRES = ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir'];

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
	...requiresAnonymous,
	[
    check('email').isEmail().withMessage(msg.validationError.email),
		check('firstName').not().isEmpty().withMessage(msg.validationError.invalidValue),
		check('lastName').not().isEmpty().withMessage(msg.validationError.invalidValue),
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.invalidValue),
		check('magicWord').not().isEmpty().isString().withMessage(msg.validationError.invalidValue),
		check('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage(msg.validationError.date),
		check('genre').optional({ values: 'falsy' }).isIn(ALLOWED_GENRES).withMessage(msg.validationError.invalidValue),
		check('documentNumber').optional({ values: 'falsy' }).isString().withMessage(msg.validationError.invalidValue),
		check('provinceId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(msg.validationError.integer),
	], 
	validate,
	AuthController.register
);

router.post("/login",
	...requiresAnonymous,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.invalidValue),
	],
	validate,
	AuthController.login
);

router.post('/refresh-token',
	authenticate,
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
	...requiresAnonymous,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
	],
	validate,
	AuthController.resendToken
);

router.post('/forgot', 
	...requiresAnonymous,
	[
		check('email').isEmail().withMessage(msg.validationError.email),
	],
	validate,
	AuthController.forgot
);


router.post('/reset/:token',
	...requiresAnonymous,
	[
		check('token').not().isEmpty().withMessage(msg.validationError.token),
		check('password').not().isEmpty().isLength({ min: 6 }).withMessage(msg.validationError.password),
	],
	validate,
	AuthController.resetPassword
);

router.get('/session',
	authenticate,
	AuthController.getSession
);

router.post('/logout',
	AuthController.logout
);

router.get('/logged',
	authenticate,
	AuthController.loggedIn
);

export default router;