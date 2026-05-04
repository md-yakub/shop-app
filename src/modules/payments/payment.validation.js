const { body, validationResult } = require("express-validator");

const AppError = require("../../utils/AppError");

const checkoutBodyValidation = [
  body("orderId")
    .exists({ checkFalsy: true })
    .withMessage("orderId is required.")
    .bail()
    .isString()
    .withMessage("orderId is required.")
    .trim(),
];

const validateCheckoutBody = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return next(new AppError("orderId is required.", 400));
};

module.exports = {
  checkoutBodyValidation,
  validateCheckoutBody,
};
