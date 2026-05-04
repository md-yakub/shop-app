const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const { paymentRateLimiter } = require("../../middlewares/rateLimit.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const paymentController = require("./payment.controller");
const {
  checkoutBodyValidation,
  validateCheckoutBody,
} = require("./payment.validation");

const router = express.Router();

router.post(
  "/checkout",
  paymentRateLimiter,
  authenticate,
  checkoutBodyValidation,
  validateCheckoutBody,
  asyncHandler(paymentController.createCheckout)
);
router.post("/webhook", asyncHandler(paymentController.handleWebhook));

module.exports = router;
