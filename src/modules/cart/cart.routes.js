const express = require("express");
const { body, param } = require("express-validator");

const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validation.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const cartController = require("./cart.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(cartController.getCart));

router.post(
  "/items",
  [
    body("productId").isString().notEmpty(),
    body("quantity").optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  asyncHandler(cartController.addItem)
);

router.patch(
  "/items/:productId",
  [
    param("productId").isString().notEmpty(),
    body("quantity").isInt({ min: 0 }).toInt(),
  ],
  validate,
  asyncHandler(cartController.updateItem)
);

router.delete(
  "/items/:productId",
  [param("productId").isString().notEmpty()],
  validate,
  asyncHandler(cartController.removeItem)
);

router.delete("/", asyncHandler(cartController.clearCart));

module.exports = router;
