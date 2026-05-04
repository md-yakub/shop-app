const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const buildLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

const authRateLimiter = buildLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: "Too many authentication requests. Please try again later.",
});

const paymentRateLimiter = buildLimiter({
  windowMs: env.PAYMENT_RATE_LIMIT_WINDOW_MS,
  limit: env.PAYMENT_RATE_LIMIT_MAX,
  message: "Too many payment requests. Please try again later.",
});

module.exports = {
  authRateLimiter,
  paymentRateLimiter,
};

