const prisma = require("../../database/prisma");
const env = require("../../config/env");
const { getStripe } = require("../../config/stripe");
const AppError = require("../../utils/AppError");
const orderRepository = require("../orders/order.repository");
const paymentRepository = require("./payment.repository");
const inventoryService = require("../inventory/inventory.service");

const ORDER_MODEL_FIELDS = new Set(
  prisma?._runtimeDataModel?.models?.Order?.fields?.map((field) => field.name) || []
);
const PAYMENT_MODEL_FIELDS = new Set(
  prisma?._runtimeDataModel?.models?.Payment?.fields?.map((field) => field.name) || []
);

const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

const withSessionIdQuery = (url) => {
  if (!url) return url;

  if (url.includes(CHECKOUT_SESSION_ID_PLACEHOLDER) || /[?&]session_id=/.test(url)) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}session_id=${CHECKOUT_SESSION_ID_PLACEHOLDER}`;
};

const getCheckoutUrls = () => {
  const baseUrl = env.CLIENT_URL.replace(/\/$/, "");
  const successBaseUrl = env.CLIENT_SUCCESS_URL || `${baseUrl}/payment-success`;
  const cancelUrl = env.CLIENT_CANCEL_URL || `${baseUrl}/payment-cancel`;
  const successUrl = withSessionIdQuery(successBaseUrl);

  return {
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
};

const getOrderPaidUpdateData = ({ order, sessionId, paymentIntentId, paidAt }) => {
  const data = {
    status: "PAID",
  };

  if (ORDER_MODEL_FIELDS.has("stripeSessionId")) {
    data.stripeSessionId = sessionId;
  }

  if (
    ORDER_MODEL_FIELDS.has("paymentIntentId") &&
    (paymentIntentId || !order.paymentIntentId)
  ) {
    data.paymentIntentId = paymentIntentId || null;
  }

  if (ORDER_MODEL_FIELDS.has("paidAt") && !order.paidAt) {
    data.paidAt = paidAt;
  }

  return data;
};

const getPaymentSucceededData = ({ payment, sessionId, paymentIntentId, paidAt }) => {
  const data = {
    status: "SUCCEEDED",
  };

  if (PAYMENT_MODEL_FIELDS.has("providerSessionId")) {
    data.providerSessionId = sessionId;
  }

  if (PAYMENT_MODEL_FIELDS.has("failureReason")) {
    data.failureReason = null;
  }

  if (
    PAYMENT_MODEL_FIELDS.has("providerPaymentId") &&
    (paymentIntentId || !payment?.providerPaymentId)
  ) {
    data.providerPaymentId = paymentIntentId || null;
  }

  if (PAYMENT_MODEL_FIELDS.has("paidAt") && !payment?.paidAt) {
    data.paidAt = paidAt;
  }

  return data;
};

const getOrderIdFromSession = (session) => {
  const orderId = session.metadata?.orderId;
  if (typeof orderId !== "string") return null;

  const trimmedOrderId = orderId.trim();
  return trimmedOrderId || null;
};

const toAmountString = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount.toFixed(2);
};

const resolvePaymentAmount = (order, session) => {
  const orderAmount = toAmountString(order.totalAmount);
  if (orderAmount) return orderAmount;

  const sessionAmount =
    typeof session.amount_total === "number"
      ? toAmountString(session.amount_total / 100)
      : null;
  if (sessionAmount) return sessionAmount;

  throw new AppError("Order total is invalid.", 400);
};

const resolvePaymentCurrency = (session, existingCurrency = "usd") => {
  if (typeof session.currency === "string" && session.currency.trim()) {
    return session.currency.toLowerCase();
  }

  return existingCurrency || "usd";
};

const findExistingPaymentForCheckoutCompletion = async (
  { orderId, sessionId, paymentIntentId },
  tx
) => {
  const byOrderId = await paymentRepository.findByOrderId(orderId, tx);
  if (byOrderId) return byOrderId;

  if (sessionId) {
    const bySessionId = await paymentRepository.findByProviderSessionId(sessionId, tx);
    if (bySessionId) return bySessionId;
  }

  if (paymentIntentId) {
    const byPaymentIntentId = await paymentRepository.findByProviderPaymentId(
      paymentIntentId,
      tx
    );
    if (byPaymentIntentId) return byPaymentIntentId;
  }

  return null;
};

const toStripeLineItemsFromOrder = (order) => {
  return order.items.map((item) => {
    const productData = {
      name: item.title,
    };

    if (item.product?.description) {
      productData.description = item.product.description;
    }

    return {
      price_data: {
        currency: "usd",
        product_data: productData,
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    };
  });
};

const assertCheckoutAccess = (order, user) => {
  if (user.role === "ADMIN") return;

  if (order.userId !== user.id) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
};

const assertOrderCanCheckout = (order) => {
  if (order.status !== "PENDING") {
    throw new AppError("Only pending orders can be checked out.", 409);
  }

  const totalAmount = Number(order.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new AppError("Order total is invalid.", 400);
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new AppError("Order has no items.", 400);
  }

  const invalidItem = order.items.find((item) => {
    const price = Number(item.price);
    return !Number.isFinite(price) || price <= 0 || item.quantity < 1;
  });

  if (invalidItem) {
    throw new AppError("Order contains invalid items.", 400);
  }
};

const getOrderForCheckout = async (orderId, user) => {
  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    throw new AppError("orderId is required.", 400);
  }

  const order = await orderRepository.findById(orderId.trim());
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  assertCheckoutAccess(order, user);
  assertOrderCanCheckout(order);

  return order;
};

const upsertPendingPayment = async (order) => {
  const amount = Number(order.totalAmount).toFixed(2);
  const existingPayment = await paymentRepository.findByOrderId(order.id);

  if (existingPayment) {
    return paymentRepository.update(existingPayment.id, {
      userId: order.userId,
      amount,
      currency: "usd",
      status: "PENDING",
      failureReason: null,
      paidAt: null,
      providerSessionId: null,
      providerPaymentId: null,
    });
  }

  return paymentRepository.create({
    orderId: order.id,
    userId: order.userId,
    amount,
    currency: "usd",
    status: "PENDING",
  });
};

const createCheckoutSession = async (user, orderId) => {
  if (!user?.id) {
    throw new AppError("Authentication required.", 401);
  }

  const stripe = getStripe();
  const order = await getOrderForCheckout(orderId, user);
  const payment = await upsertPendingPayment(order);

  try {
    const metadata = {
      orderId: order.id,
      userId: user.id,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: toStripeLineItemsFromOrder(order),
      client_reference_id: order.id,
      metadata,
      payment_intent_data: { metadata },
      ...getCheckoutUrls(),
    });

    await paymentRepository.update(payment.id, {
      providerSessionId: session.id,
    });

    return {
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
    };
  } catch (error) {
    await paymentRepository.update(payment.id, {
      status: "FAILED",
      failureReason: "Unable to create Stripe Checkout session.",
    });
    throw error;
  }
};

const markCheckoutCompleted = async (session) => {
  const orderId = getOrderIdFromSession(session);
  if (!orderId) {
    throw new AppError("Order not found for Stripe session.", 404);
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const paidAt = new Date();

  await prisma.$transaction(async (tx) => {
    const order = await orderRepository.findById(orderId, tx);
    if (!order) {
      throw new AppError("Order not found for Stripe session.", 404);
    }

    const wasAlreadyPaid = order.status === "PAID" && order.paidAt !== null;

    if (!wasAlreadyPaid && !order.stockAdjustedAt) {
      await inventoryService.reduceStockForOrder(order, tx);
    }

    const payment = await findExistingPaymentForCheckoutCompletion(
      {
        orderId: order.id,
        sessionId: session.id,
        paymentIntentId,
      },
      tx
    );
    if (payment && payment.orderId !== order.id) {
      throw new AppError("Payment record mismatch for Stripe session.", 409);
    }

    const paymentUpdateData = getPaymentSucceededData({
      payment,
      sessionId: session.id,
      paymentIntentId,
      paidAt,
    });

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: paymentUpdateData,
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          amount: resolvePaymentAmount(order, session),
          currency: resolvePaymentCurrency(session),
          ...paymentUpdateData,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: getOrderPaidUpdateData({
        order,
        sessionId: session.id,
        paymentIntentId,
        paidAt,
      }),
    });
  });
};

const cancelOrderPayment = async ({ orderId, paymentId, providerPaymentId, reason }) => {
  await prisma.$transaction(async (tx) => {
    let payment = null;

    if (paymentId) {
      payment = await paymentRepository.findById(paymentId, tx);
    } else if (providerPaymentId) {
      payment = await paymentRepository.findByProviderPaymentId(providerPaymentId, tx);
    } else if (orderId) {
      payment = await paymentRepository.findByOrderId(orderId, tx);
    }

    const resolvedOrderId = orderId || payment?.orderId;
    if (!resolvedOrderId) return;

    const order = await orderRepository.findById(resolvedOrderId, tx);
    if (!order) return;

    await inventoryService.restoreStockForOrder(order, tx);

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: reason,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
  });
};

const handlePaymentIntentFailed = async (paymentIntent) => {
  await cancelOrderPayment({
    orderId: paymentIntent.metadata?.orderId,
    paymentId: paymentIntent.metadata?.paymentId,
    providerPaymentId: paymentIntent.id,
    reason: paymentIntent.last_payment_error?.message || "Payment failed.",
  });
};

const handleCheckoutExpired = async (session) => {
  await cancelOrderPayment({
    orderId: getOrderIdFromSession(session),
    paymentId: session.metadata?.paymentId,
    reason: "Stripe Checkout session expired.",
  });
};

const registerWebhookEvent = async (event) => {
  const existingEvent = await paymentRepository.findWebhookEvent(event.id);
  if (existingEvent?.processedAt) return { duplicate: true };
  if (existingEvent) return { duplicate: false };

  try {
    await paymentRepository.createWebhookEvent({
      id: event.id,
      type: event.type,
    });
  } catch (error) {
    const createdEvent = await paymentRepository.findWebhookEvent(event.id);
    if (createdEvent?.processedAt) return { duplicate: true };
  }

  return { duplicate: false };
};

const handleStripeWebhook = async (rawBody, signature) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError("Stripe webhook secret is not configured.", 503);
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    throw new AppError("Invalid Stripe webhook signature.", 400);
  }

  const registration = await registerWebhookEvent(event);
  if (registration.duplicate) {
    return { received: true, duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed":
      try {
        await markCheckoutCompleted(event.data.object);
      } catch (error) {
        const session = event.data.object || {};
        const checkoutPaymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;

        console.error("Stripe checkout.session.completed webhook failed:", {
          eventId: event.id,
          sessionId: session.id || null,
          orderId: session.metadata?.orderId || null,
          paymentIntentId: checkoutPaymentIntentId,
          message: error.message,
          stack: error.stack,
        });

        throw error;
      }
      break;
    case "checkout.session.expired":
      await handleCheckoutExpired(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object);
      break;
    default:
      break;
  }

  await paymentRepository.markWebhookEventProcessed(event.id);

  return { received: true, duplicate: false };
};

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
};
