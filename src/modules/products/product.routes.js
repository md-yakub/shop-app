const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const productController = require("./product.controller");
const {
  productIdValidation,
  listProductsValidation,
  createProductValidation,
  updateProductValidation,
  validateCreateProduct,
} = require("./product.validation");

const router = express.Router();

router.get("/", listProductsValidation, validate, asyncHandler(productController.listProducts));

router.get(
  "/me/my-products",
  authenticate,
  listProductsValidation,
  validate,
  asyncHandler(productController.listMyProducts)
);

// TODO: move to /api/v1/admin/products when dedicated admin router is introduced.
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("ADMIN"),
  listProductsValidation,
  validate,
  asyncHandler(productController.listAdminProducts)
);

router.get("/:id", productIdValidation, validate, asyncHandler(productController.getProduct));

router.post(
  "/",
  authenticate,
  createProductValidation,
  validateCreateProduct,
  asyncHandler(productController.createProduct)
);

router.patch(
  "/:id",
  authenticate,
  productIdValidation,
  updateProductValidation,
  validate,
  asyncHandler(productController.updateProduct)
);

router.delete(
  "/:id",
  authenticate,
  productIdValidation,
  validate,
  asyncHandler(productController.deleteProduct)
);

module.exports = router;
