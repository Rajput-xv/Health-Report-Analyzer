const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user data from MongoDB
    const user = await User.findById(decoded.userId);

    // Tokens issued before tokenVersion existed carry none and count as version 0
    if (!user || !user.isActive || (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({
        error: 'Invalid token.'
      });
    }

    req.user = user.toSafeObject();

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Invalid token.'
    });
  }
};

module.exports = authMiddleware;
