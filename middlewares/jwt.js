import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import model from '../models/index.js';


const opts = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: process.env.JWT_SECRET
};

const configureJwt = passport => {
	passport.use(
		new JwtStrategy(opts, async (jwt_payload, done) => {
			console.log('[JWT Middleware] Verifying JWT:', jwt_payload);
			await model.User.findOne({
				attributes: ['id', 'firstName', 'lastName', 'fullName', 'role', 'imageUrl', 'email'],
				where: {
					id: jwt_payload.id
				}
			})
				.then(user => {
					if (user) return done(null, user);
					return done(null, false);
				})
				.catch(err => {
					return done(err, false, { message: '[JWT Middleware] Hubo un error en la autenticación' });
				});
		})
	);
};

export default configureJwt;