const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const productRoutes = require("./modules/products/product.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const orderRoutes = require("./modules/orders/order.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const notFound = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const requestLogger = require("./middlewares/requestLogger.middleware");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();

app.use(helmet());
app.use(
  cors(
    env.CORS_ORIGIN === "*"
      ? { origin: "*" }
      : { origin: env.CORS_ORIGIN.split(","), credentials: true }
  )
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

app.get("/health", (req, res) => {
  return sendSuccess(res, { status: "ok" }, "Service is healthy.");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
