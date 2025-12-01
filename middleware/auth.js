const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  console.log('Auth middleware - Headers:', Object.keys(req.headers));
  console.log('Auth middleware - X-Guest-User header:', req.headers['x-guest-user']);

  // Check for Bearer token (registered users)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      console.log('Auth middleware - Token user found:', req.user?.firstName);
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // Check for guest user header
  if (req.headers['x-guest-user']) {
    try {
      const guestUser = JSON.parse(req.headers['x-guest-user']);
      console.log('Auth middleware - Parsed guest user:', guestUser);
      if (guestUser.isGuest && guestUser.id && guestUser.firstName) {
        req.user = {
          _id: guestUser.id,
          id: guestUser.id,
          firstName: guestUser.firstName,
          emailOrMobile: `guest_${guestUser.id}@crowdverse.local`,
          isGuest: true
        };
        console.log('Auth middleware - Guest user created:', req.user);
        return next();
      }
    } catch (error) {
      console.error('Error parsing guest user header:', error);
    }
  }

  console.log('Auth middleware - No authentication found');
  if (!token && !req.headers['x-guest-user']) {
    return res.status(401).json({ message: 'Not authorized, no token or guest credentials' });
  }
};

module.exports = { protect };
