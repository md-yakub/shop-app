const { body, query, validationResult } = require("express-validator");
const AppError = require("../../utils/AppError");
const {
  paginationQueryValidation,
  sortQueryValidation,
  idParamValidation,
} = require("../../middlewares/common.validation");

const productIdValidation = idParamValidation("id");

const productListSortValidation = sortQueryValidation([
  "createdAt",
  "updatedAt",
  "price",
  "title",
  "stock",
]);

const listProductsValidation = [
  ...paginationQueryValidation,
  ...productListSortValidation,
  query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
  query("categoryId").optional().isString().trim().notEmpty(),
  query("minPrice").optional().isFloat({ min: 0 }).toFloat(),
  query("maxPrice").optional().isFloat({ min: 0 }).toFloat(),
  query().custom((_, { req }) => {
    const min = req.query.minPrice;
    const max = req.query.maxPrice;

    if (min != null && max != null && Number(min) > Number(max)) {
      throw new Error("minPrice cannot be greater than maxPrice.");
    }

    return true;
  }),
];

const createProductValidation = [
  body("title").isString().isLength({ min: 3 }).trim(),
  body("price").isFloat({ gt: 0 }).toFloat(),
  body("description").isString().isLength({ min: 5, max: 1000 }).trim(),
  body("imageUrl").isString().notEmpty().trim(),
  body("stock").exists({ checkNull: true }).isInt({ min: 0 }).toInt(),
];

const updateProductValidation = [
  body("title").optional().isString().isLength({ min: 3 }).trim(),
  body("price").optional().isFloat({ gt: 0 }).toFloat(),
  body("description").optional().isString().isLength({ min: 5, max: 1000 }).trim(),
  body("imageUrl").optional().isString().notEmpty().trim(),
  body("stock").optional().isInt({ min: 0 }).toInt(),
  body().custom((value, { req }) => {
    const allowedFields = ["title", "price", "description", "imageUrl", "stock"];
    const hasAtLeastOneField = allowedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field)
    );

    if (!hasAtLeastOneField) {
      throw new Error("At least one updatable field is required.");
    }

    return true;
  }),
];

const validateCreateProduct = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return next(
    new AppError("Invalid product create data.", 400, errors.array({ onlyFirstError: true }))
  );
};

module.exports = {
  productIdValidation,
  listProductsValidation,
  createProductValidation,
  updateProductValidation,
  validateCreateProduct,
};
