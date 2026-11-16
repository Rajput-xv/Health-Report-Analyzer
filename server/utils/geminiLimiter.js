const rateLimit = require('express-rate-limit');

// Every Gemini call costs money, so cap them per account. Must run after authMiddleware.
module.exports = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please try again later.' }
});
