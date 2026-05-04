const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNumber(process.env.PORT, 3000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    process.env.SESSION_SECRET ||
    "development-access-secret",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    process.env.SESSION_SECRET ||
    "development-refresh-secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  REFRESH_TOKEN_TTL_DAYS: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
  CLIENT_SUCCESS_URL: process.env.CLIENT_SUCCESS_URL,
  CLIENT_CANCEL_URL: process.env.CLIENT_CANCEL_URL,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  AUTH_RATE_LIMIT_WINDOW_MS: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  PAYMENT_RATE_LIMIT_WINDOW_MS: toNumber(
    process.env.PAYMENT_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),
  PAYMENT_RATE_LIMIT_MAX: toNumber(process.env.PAYMENT_RATE_LIMIT_MAX, 30),
};

if (!env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment");
}

module.exports = env;
