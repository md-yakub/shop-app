const { query, param } = require("express-validator");

const paginationQueryValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const sortQueryValidation = (allowedFields) => [
  query("sort")
    .optional()
    .isString()
    .bail()
    .custom((value) => {
      const [field, direction] = value.split(":");
      if (!field || !allowedFields.includes(field.trim())) {
        throw new Error("Invalid sort field.");
      }

      if (
        direction &&
        direction.trim().toLowerCase() !== "asc" &&
        direction.trim().toLowerCase() !== "desc"
      ) {
        throw new Error("Invalid sort direction.");
      }

      return true;
    }),
];

const idParamValidation = (name) => [param(name).isString().notEmpty().trim()];

module.exports = {
  paginationQueryValidation,
  sortQueryValidation,
  idParamValidation,
};

