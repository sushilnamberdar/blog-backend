// middleware/rateLimiters.js
const rateLimit = require("express-rate-limit");

// ⏳ Limit forgot-password requests: 1 per 2 hours per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 3, // allow only 1 request in that period
  message: {
    success: false,
    message: "Too many password reset attempts. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  forgotPasswordLimiter,
};
