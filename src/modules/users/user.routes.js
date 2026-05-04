const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const userController = require("./user.controller");
const { listUsersValidation } = require("./user.validation");

const router = express.Router();

router.get("/me", authenticate, asyncHandler(userController.getMe));
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  listUsersValidation,
  validate,
  asyncHandler(userController.listUsers)
);

module.exports = router;
