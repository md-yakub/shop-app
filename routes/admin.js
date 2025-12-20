const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

/**
 * GET /admin/add-product
 */
router.get("/add-product", isAuth, adminController.getAddProduct);

/**
 * GET /admin/products
 */
router.get("/products", isAuth, adminController.getProducts);

/**
 * POST /admin/add-product
 */
router.post(
  "/add-product",
  isAuth,
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 400 }).trim(),
  ],
  adminController.postAddProduct
);

/**
 * GET /admin/edit-product/:productId
 */
router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

/**
 * POST /admin/edit-product
 */
router.post(
  "/edit-product",
  isAuth,
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 400 }).trim(),
  ],
  adminController.postEditProduct
);

/**
 * DELETE /admin/product/:productId
 */
router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
