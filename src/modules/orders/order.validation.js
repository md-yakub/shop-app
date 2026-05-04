const { body, query } = require("express-validator");
const {
  paginationQueryValidation,
  sortQueryValidation,
  idParamValidation,
} = require("../../middlewares/common.validation");

const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const orderIdParamValidation = idParamValidation("orderId");

const adminOrderListValidation = [
  ...paginationQueryValidation,
  ...sortQueryValidation(["createdAt", "updatedAt", "totalAmount", "paidAt", "status"]),
  query("status")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .isIn(ORDER_STATUS_VALUES),
];

const adminStatusUpdateValidation = [
  ...orderIdParamValidation,
  body("status")
    .isString()
    .trim()
    .toUpperCase()
    .isIn(ORDER_STATUS_VALUES),
];

module.exports = {
  ORDER_STATUS_VALUES,
  orderIdParamValidation,
  adminOrderListValidation,
  adminStatusUpdateValidation,
};
