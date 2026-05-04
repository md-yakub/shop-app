const stripeFactory = require("stripe");

const env = require("./env");
const AppError = require("../utils/AppError");

let stripeClient;

const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError("Stripe is not configured.", 503);
  }

  if (!stripeClient) {
    stripeClient = stripeFactory(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

module.exports = { getStripe };
