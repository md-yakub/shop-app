const AppError = require("../utils/AppError");
const env = require("../config/env");

const prismaCodeToError = (error) => {
  if (error.code === "P2002") {
    return new AppError("A record with this value already exists.", 409, {
      target: error.meta?.target,
    });
  }

  if (error.code === "P2025") {
    return new AppError("Record not found.", 404);
  }

  if (error.code === "P2003") {
    return new AppError("Record cannot be changed because it is still referenced.", 409);
  }

  return error;
};

const errorMiddleware = (error, req, res, next) => {
  const isPrismaError = Boolean(error.code?.startsWith?.("P"));
  const normalizedError = error.code?.startsWith?.("P")
    ? prismaCodeToError(error)
    : error;

  const statusCode = normalizedError.statusCode || 500;
  const isOperational = normalizedError.isOperational || normalizedError instanceof AppError;

  const payload = {
    success: false,
    message: isOperational ? normalizedError.message : "Internal server error.",
  };

  if (normalizedError.details) {
    payload.errors = normalizedError.details;
  }

  if (isPrismaError && env.NODE_ENV === "development") {
    console.error("Prisma error:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
  }

  if (!isOperational) {
    console.error(normalizedError);
  }

  return res.status(statusCode).json(payload);
};

module.exports = errorMiddleware;
