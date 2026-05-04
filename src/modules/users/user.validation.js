const { query } = require("express-validator");
const {
  paginationQueryValidation,
  sortQueryValidation,
} = require("../../middlewares/common.validation");

const listUsersValidation = [
  ...paginationQueryValidation,
  ...sortQueryValidation(["createdAt", "updatedAt", "email", "role"]),
  query("search").optional().isString().trim().isLength({ min: 1, max: 100 }),
  query("role").optional().isString().trim().toUpperCase().isIn(["USER", "ADMIN"]),
];

module.exports = {
  listUsersValidation,
};
