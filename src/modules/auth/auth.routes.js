const express = require("express");
const { body } = require("express-validator");

const validate = require("../../middlewares/validation.middleware");
const { authRateLimiter } = require("../../middlewares/rateLimit.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const authController = require("./auth.controller");

const router = express.Router();

const emailRule = () => body("email").isEmail().normalizeEmail();
const passwordRule = () => body("password").isString().isLength({ min: 5 });

router.post(
  "/register",
  authRateLimiter,
  [emailRule(), passwordRule()],
  validate,
  asyncHandler(authController.register)
);

router.post(
  "/login",
  authRateLimiter,
  [emailRule(), passwordRule()],
  validate,
  asyncHandler(authController.login)
);

router.post(
  "/refresh",
  authRateLimiter,
  [body("refreshToken").isString().notEmpty()],
  validate,
  asyncHandler(authController.refresh)
);

router.post(
  "/logout",
  authRateLimiter,
  [body("refreshToken").optional().isString()],
  validate,
  asyncHandler(authController.logout)
);

module.exports = router;
