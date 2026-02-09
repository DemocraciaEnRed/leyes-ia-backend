/**
 * This middleware checks if the request has a req.user object.
 * If it does, it returns a 403 error.
 * This middleware is used in routes that should only be accessed by anonymous users.
*/

const requiresAnon = (req, res, next) => {
  if(req.user) {
    console.error('requiresAnon - User is already logged in');
    return res.status(403).json({ message: 'You are already logged in' });
  }

  // No user, continue
  next();
}

export default requiresAnon;