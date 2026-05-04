const paymentService = require("./payment.service");
const { sendSuccess } = require("../../utils/apiResponse");

const createCheckout = async (req, res) => {
  const checkout = await paymentService.createCheckoutSession(req.user, req.body.orderId);
  return sendSuccess(res, checkout, "Checkout session created.", 201);
};

const handleWebhook = async (req, res) => {
  const result = await paymentService.handleStripeWebhook(
    req.body,
    req.get("stripe-signature")
  );

  return sendSuccess(res, result, "Webhook processed.");
};

module.exports = {
  createCheckout,
  handleWebhook,
};
