const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const adminController = require("./admin.controller");
const {
  orderIdParamValidation,
  adminOrderListValidation,
  adminStatusUpdateValidation,
} = require("../orders/order.validation");

const router = express.Router();

router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/dashboard", asyncHandler(adminController.getDashboard));

router.get(
  "/orders",
  adminOrderListValidation,
  validate,
  asyncHandler(adminController.listOrders)
);

router.get(
  "/orders/:orderId",
  orderIdParamValidation,
  validate,
  asyncHandler(adminController.getOrder)
);

router.patch(
  "/orders/:orderId/status",
  adminStatusUpdateValidation,
  validate,
  asyncHandler(adminController.updateOrderStatus)
);

module.exports = router;

