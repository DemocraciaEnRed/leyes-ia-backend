import model from '../models/index.js';
import * as AuthHelper from '../helpers/authHelper.js';
import dayjs from 'dayjs';
import msg from '../utils/messages.js';

/**
 * It registers a new user
 * @route POST /auth/register
 * @param {String} req.body.email - The email of the user
 * @param {String} req.body.password - The password of the user
 * @param {String} req.body.name - The name of the user
 * @param {String} req.body.lang - The language of the user
 */

export const register = async (req, res) => {
  try {
		const { email, firstName, lastName, password, magicWord } = req.body;
    console.log('got body')

		// Make sure this account doesn't already exist
		const user = await model.User.findOne({ where: { email } });
		console.log('got user')
		if (user){
			console.log('user exists')
			return res.status(401).json({ message: 'El email ya se encuentra registrado' });
		} 
		// if magic word is incorrect, return an error
		console.log('checking magic word')
		if(magicWord && process.env.MAGIC_WORD && magicWord !== process.env.MAGIC_WORD) {
			console.log('magic word incorrect')
			return res.status(401).json({ message: 'Palabra mágica incorrecta' });
		}
		console.log('magic word correct, creating user')

		const newUser = await model.User.create({ email, firstName, lastName, password });
		console.log('created user')
		// In dev mode, automatically verify email
		if(process.env.NODE_ENV === 'development') {
			console.log('development mode, auto verifying email')
			await newUser.update({ emailVerified: true, verifiedAt: new Date() });
		}
		// or if the magic word is correct, also verify email
		if(magicWord && process.env.MAGIC_WORD && magicWord === process.env.MAGIC_WORD) {
			console.log('magic word correct, auto verifying email')
			await newUser.update({ emailVerified: true, verifiedAt: new Date() });
		}
		
		const token = await newUser.generateVerificationToken();
		console.log('got token')

		// make the url
		const url = `${process.env.APP_URL}/signup/verify?token=${token.token}`;

		// send the email
		try {
			await AuthHelper.sendSignupEmail(newUser, url);
		} catch (error) {
			console.error(error);
			console.log('cannot send mail')
		}

		return res.status(201).json({ message: 'Usuario registrado. Por favor, valida tu cuenta',
       url: url,
       token: await newUser.generateJWT(),
       user: newUser.getUserSessionInfo()
      });
  
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
}

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await model.User.findOne({ where: { email } });

		if (!user) {
			return res.status(401).json({ message: 'Credenciales incorrectas' });
		}

		const valid = await user.comparePassword(password);
		if(!valid) {
			return res.status(401).json({ message: 'Credenciales incorrectas' });
		}

		if(!user.emailVerified) {
			return res.status(401).json({ message: 'El email no ha sido verificado' });
		}

		if(user.disabled) {
			return res.status(401).json({ message: 'La cuenta ha sido deshabilitada. Contacte a un administrador' });
		}

		// login successful, write token, and send back to user
		const token = await user.generateJWT();

		return res.status(200).json({ token, user: user.getUserSessionInfo() });

	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Error al iniciar sesión' });
	}
}

export const refreshToken = async (req, res) => {
	try {
		// authenticate middlerware will already check if the user is logged in
		const user = req.user;

		// login successful, write token, and send back to user
		return res.status(200).json({ token: await user.generateJWT(), user: user.getUserSessionInfo() });

	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Error al refrescar el token' });
	}
}

/**
 * Verifies a user's email address
 * @route GET /auth/verify/:token
 * @param {string} req.params.token - The token sent to the user's email address
 * @returns {Object} - A message that the user's email has been verified
 */
export const verify = async (req, res) => {
	try {
		// find the matching token
		const token = await model.UserToken.findOne({ where: { token: req.params.token } });
		const now = new Date();
		// if the token is not found, return an error 
		if (!token) {
			return res.status(400).json({ message: msg.auth.error.tokenNotFound });
		}
		const tokenExpired = dayjs(token.expiresAt).isBefore(now);
		// if the token is expired, return an error
		if (tokenExpired) {
			return res.status(400).json({ message: msg.auth.error.tokenExpired });
		}
		// If we found a token, find a matching user
		const user = await model.User.findByPk(token.userId);
		// if the user is not found return an error
		if (!user) {
			return res.status(400).json({ message: msg.auth.error.userNotFound });
		}
		// if the user is already verified, return error
		if (user.emailVerified) {
			return res.status(400).json({ message: msg.auth.error.alreadyVerified });
		}
		// token exists and the user is not verified, so we can verify the user
		await user.update({ emailVerified: true, verifiedAt: now });

		// delete the token
		await token.destroy();

		// Show a friendly success message
		return res.status(200).json({ message: msg.auth.success.verification });

	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Error al verificar el usuario' });
	}
}

export const resendToken = async (req, res) => {
	try {
		const { email } = req.body;
		// find the user
		const user = await model.User.findOne({ where: { email } });
		// if the user is not found return an error
		if (!user) {
			const html = await AuthHelper.getNoUserHtml(email);
			return res.status(400).send(html);
		}
		// if the user is already verified, return error
		if (user.emailVerified) {
			const html = await AuthHelper.getAlreadyVerifiedHtml(user);
			return res.status(400).send(html);
		}
		// generate a new token 
		const token = await user.generateVerificationToken();
		// make the url
		const url = `${process.env.APP_URL}/signup/verify/${token.token}`;
		// send the email
		// TODO
		
		return res.status(200).json({ message: msg.auth.success.verificationMailResent, url: url });
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const forgot = async (req, res) => {
	try {
		const { email } = req.body;
		// find the user
		const user = await model.User.findOne({ where: { email } });
		// if the user is not found return an error
		// if the user is not found return an error
		if (!user) {
			const html = await AuthHelper.getNoUserHtml(email);
			return res.status(400).send(html);
		}
		// generate a new token 
		const token = await user.generateResetToken();
		// make the url
		const url = `${process.env.APP_URL}/recover/reset?token=${token.token}`;
		// send the email

		// send the email
		try {
			await AuthHelper.sendPasswordResetEmail(user, url);
		} catch (error) {
			console.error(error);
			console.log('cannot send mail')
		}
		
		return res.status(200).json({ message: msg.auth.success.resetMailSent, url: url });
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		// find the matching token
		const resetToken = await model.UserToken.findOne({ where: { token: token } });
		
		// if the token is not found, return an error
		if (!resetToken) {
			const html = await AuthHelper.getNoTokenHtml();
			return res.status(400).send(html);
		}
		const now = new Date();
		const tokenExpired = dayjs(resetToken.expiresAt).isBefore(now);
		// if the token is expired, return an error
		if (tokenExpired) {
			const html = await AuthHelper.getExpiredTokenHtml();
			return res.status(400).send(html);
		}
		// If we found a token, find a matching user
		const user = await model.User.findByPk(resetToken.userId);
		// if the user is not found return an error)
		if (!user) {
			const html = await AuthHelper.getNoUserHtml(email);
			return res.status(400).send(html);
		}
		// update the user's password
		await user.update({ password });

		// delete the token
		await resetToken.destroy();
		
		// Show a friendly success message
		return res.status(200).json({ message: msg.auth.success.passwordUpdated });
	
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const loggedIn = async (req, res) => {
  try {
		let loggedIn = false
		if(req.user) {
			loggedIn = true
		}
		return res.status(200).json({ loggedIn: loggedIn })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const getSession = async (req, res) => {
	try {
		if(req.user) {
			return res.status(200).json(req.user)
		}
		return res.status(401).json({ message: 'No hay sesión activa' })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const logout = async (req, res) => {
	try {
		return res.status(200).json({ message: 'Sesión cerrada' })
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}