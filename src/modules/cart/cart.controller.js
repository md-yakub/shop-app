const cartService = require("./cart.service");
const { sendSuccess } = require("../../utils/apiResponse");

const getCart = async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  return sendSuccess(res, cart, "Cart fetched.");
};

const addItem = async (req, res) => {
  const cart = await cartService.addItem(
    req.user.id,
    req.body.productId,
    req.body.quantity || 1
  );
  return sendSuccess(res, cart, "Cart item added.", 201);
};

const updateItem = async (req, res) => {
  const cart = await cartService.updateItem(
    req.user.id,
    req.params.productId,
    req.body.quantity
  );
  return sendSuccess(res, cart, "Cart item updated.");
};

const removeItem = async (req, res) => {
  const cart = await cartService.removeItem(req.user.id, req.params.productId);
  return sendSuccess(res, cart, "Cart item removed.");
};

const clearCart = async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  return sendSuccess(res, cart, "Cart cleared.");
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
