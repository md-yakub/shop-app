const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const orderController = require("./order.controller");
const {
  orderIdParamValidation,
  adminOrderListValidation,
  adminStatusUpdateValidation,
} = require("./order.validation");

const router = express.Router();

router.use(authenticate);

router.post("/", asyncHandler(orderController.createOrder));

router.get("/", asyncHandler(orderController.listOrders));

router.get(
  "/admin/all",
  authorizeRoles("ADMIN"),
  adminOrderListValidation,
  validate,
  asyncHandler(orderController.listAllOrders)
);

router.patch(
  "/admin/:orderId/status",
  authorizeRoles("ADMIN"),
  adminStatusUpdateValidation,
  validate,
  asyncHandler(orderController.updateOrderStatus)
);

router.patch(
  "/:orderId/cancel",
  orderIdParamValidation,
  validate,
  asyncHandler(orderController.cancelOrder)
);

router.get(
  "/:orderId",
  orderIdParamValidation,
  validate,
  asyncHandler(orderController.getOrder)
);

module.exports = router;
