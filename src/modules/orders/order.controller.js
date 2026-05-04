const orderService = require("./order.service");
const { sendSuccess } = require("../../utils/apiResponse");

const createOrder = async (req, res) => {
  const order = await orderService.createOrderFromCart(req.user);
  return sendSuccess(res, order, "Order created.", 201);
};

const listOrders = async (req, res) => {
  const orders = await orderService.listOrdersForUser(req.user);
  return sendSuccess(res, orders, "Orders fetched.");
};

const listAllOrders = async (req, res) => {
  const { data, meta } = await orderService.listAdminOrders(req.query);
  return sendSuccess(res, data, "Orders fetched.", 200, meta);
};

const getOrder = async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, req.user);
  return sendSuccess(res, order, "Order fetched.");
};

const updateOrderStatus = async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.orderId, req.body.status);
  return sendSuccess(res, order, "Order status updated.");
};

const cancelOrder = async (req, res) => {
  const order = await orderService.cancelOrder(req.params.orderId, req.user);
  return sendSuccess(res, order, "Order cancelled.");
};

module.exports = {
  createOrder,
  listOrders,
  listAllOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
};
