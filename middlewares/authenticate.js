//const passport = require("passport");
import passport from "passport";

const authenticate = (req, res, next) => {
	// if there is no token, continue
	// if (!req.headers.authorization) return next();
  // console.log('optionalAuthenticate')
	passport.authenticate('jwt', function (err, user, info) {
		
    // console.log('-- middleware/authenticate - user: ', user)
    if (err) return next(err);

		if (!user) {
			return next();
		}

		req.user = user;
		return next();
	})(req, res, next);
};

export default authenticate;