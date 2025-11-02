const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // 🔍 1. Try to get token from cookie
    let token = req.cookies?.token;

    // 🔍 2. If not in cookie, try from Authorization header
    if (!token && req.header('Authorization')) {
      token = req.header('Authorization').replace('Bearer ', '');
    }

    // ❌ No token found at all
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found or token invalid' });
    }

    // ✅ Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth Error:', error.message);
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// ✅ Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'User role not authorized please update your role by visiting profile section ' });
    }
    next();
  };
};

module.exports = { auth, authorize };
