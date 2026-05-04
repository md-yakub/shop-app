const { sendSuccess } = require("../../utils/apiResponse");
const adminService = require("./admin.service");
const orderService = require("../orders/order.service");

const getDashboard = async (req, res) => {
  const dashboard = await adminService.getDashboardData();
  return sendSuccess(res, dashboard, "Dashboard fetched.");
};

const listOrders = async (req, res) => {
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

module.exports = {
  getDashboard,
  listOrders,
  getOrder,
  updateOrderStatus,
};

