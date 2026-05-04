const AppError = require("../../utils/AppError");
const prisma = require("../../database/prisma");
const cartRepository = require("../cart/cart.repository");
const inventoryService = require("../inventory/inventory.service");
const orderRepository = require("./order.repository");
const { toOrderDto } = require("./order.mapper");
const { parsePagination, parseSort, toOrderBy, buildPaginationMeta } = require("../../utils/query");

const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const ORDER_SORT_FIELDS = ["createdAt", "updatedAt", "totalAmount", "paidAt", "status"];
const DB_ORDER_STATUS_VALUES = new Set(
  prisma?._runtimeDataModel?.enums?.OrderStatus?.values?.map((value) => value.name) || []
);

const NON_CANCELLABLE_STATUSES = new Set(["CANCELLED", "FULFILLED", "DELIVERED", "REFUNDED"]);
const ADMIN_STATUS_TRANSITIONS = {
  PENDING: new Set(["PENDING", "PAID", "CANCELLED"]),
  PAID: new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  PROCESSING: new Set(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  SHIPPED: new Set(["SHIPPED", "DELIVERED", "CANCELLED"]),
  DELIVERED: new Set(["DELIVERED"]),
  CANCELLED: new Set(["CANCELLED"]),
};

const calculateCartTotal = (items) => {
  return items.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity;
  }, 0);
};

const getOrderOrThrow = async (orderId, client = prisma) => {
  const order = await orderRepository.findById(orderId, client);
  if (!order) throw new AppError("Order not found.", 404);
  return order;
};

const assertOrderAccess = (order, user) => {
  if (user.role === "ADMIN") return;

  if (order.userId !== user.id) {
    throw new AppError("Order not found.", 404);
  }
};

const assertUserCanCancelOrder = (order, user) => {
  if (user.role !== "ADMIN" && order.status !== "PENDING") {
    throw new AppError("Only pending orders can be cancelled.", 409);
  }

  if (NON_CANCELLABLE_STATUSES.has(order.status)) {
    throw new AppError("Order cannot be cancelled at its current status.", 409);
  }
};

const toLifecycleStatus = (dbStatus) => {
  if (dbStatus === "FULFILLED") return "DELIVERED";
  return dbStatus;
};

const normalizeRequestedOrderStatus = (requestedStatus) => {
  const normalizedStatus = typeof requestedStatus === "string" ? requestedStatus.trim().toUpperCase() : "";

  if (!ORDER_STATUS_VALUES.includes(normalizedStatus)) {
    throw new AppError("Invalid order status.", 422);
  }

  return normalizedStatus;
};

const toPersistedOrderStatus = (apiStatus) => {
  if (DB_ORDER_STATUS_VALUES.has(apiStatus)) return apiStatus;

  if (apiStatus === "PROCESSING") return "PAID";
  if (apiStatus === "SHIPPED" || apiStatus === "DELIVERED") {
    return DB_ORDER_STATUS_VALUES.has("SHIPPED") ? "SHIPPED" : "FULFILLED";
  }

  return apiStatus;
};

const assertValidAdminStatusTransition = (currentDbStatus, nextDbStatus) => {
  const currentStatus = toLifecycleStatus(currentDbStatus);
  const nextStatus = toLifecycleStatus(nextDbStatus);
  const allowedStatuses = ADMIN_STATUS_TRANSITIONS[currentStatus];

  if (!allowedStatuses || !allowedStatuses.has(nextStatus)) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${nextStatus}.`,
      409
    );
  }
};

const getAdminListQuery = (query = {}) => {
  const { page, limit, skip, take } = parsePagination(query, {
    page: 1,
    limit: 10,
  });
  const sort = parseSort(query.sort, ORDER_SORT_FIELDS, {
    field: "createdAt",
    direction: "desc",
  });
  const where = {};

  if (query.status) {
    where.status = toPersistedOrderStatus(normalizeRequestedOrderStatus(query.status));
  }

  return {
    page,
    limit,
    skip,
    take,
    where,
    orderBy: toOrderBy(sort),
  };
};

const createOrderFromCart = async (user) => {
  if (!user?.id) throw new AppError("Authentication required.", 401);

  const order = await prisma.$transaction(async (tx) => {
    const cartItems = await cartRepository.getItemsByUserId(user.id, tx);

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty.", 400);
    }

    inventoryService.assertCartStock(cartItems);

    const totalAmount = calculateCartTotal(cartItems).toFixed(2);

    const createdOrder = await orderRepository.createWithItems(
      {
        user,
        items: cartItems,
        totalAmount,
      },
      tx
    );

    await inventoryService.reduceStockForOrder(createdOrder, tx);
    await cartRepository.clearByUserId(user.id, tx);

    return orderRepository.findById(createdOrder.id, tx);
  });

  return toOrderDto(order);
};

const listOrdersForUser = async (user) => {
  if (!user?.id) throw new AppError("Authentication required.", 401);

  const orders = await orderRepository.findByUserId(user.id);

  return orders.map(toOrderDto);
};

const listAllOrders = async () => {
  const orders = await orderRepository.findAll();
  return orders.map(toOrderDto);
};

const listAdminOrders = async (query = {}) => {
  const { page, limit, skip, take, where, orderBy } = getAdminListQuery(query);
  const [orders, total] = await Promise.all([
    orderRepository.findManyAdmin({ where, orderBy, skip, take }),
    orderRepository.count({ where }),
  ]);

  return {
    data: orders.map(toOrderDto),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const getOrder = async (orderId, user) => {
  if (!user?.id) throw new AppError("Authentication required.", 401);

  const order = await getOrderOrThrow(orderId);
  assertOrderAccess(order, user);

  return toOrderDto(order);
};

const updateOrderStatus = async (orderId, requestedStatus) => {
  const normalizedStatus = normalizeRequestedOrderStatus(requestedStatus);
  const persistedStatus = toPersistedOrderStatus(normalizedStatus);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await getOrderOrThrow(orderId, tx);
    assertValidAdminStatusTransition(order.status, normalizedStatus);

    if (persistedStatus === "CANCELLED" && order.stockAdjustedAt) {
      if (toLifecycleStatus(order.status) !== "CANCELLED") {
        await inventoryService.restoreStockForOrder(order, tx);
      }
    } else if (persistedStatus !== "CANCELLED" && order.status === "CANCELLED") {
      throw new AppError("Cancelled orders cannot be re-opened.", 409);
    } else if (persistedStatus === "PAID" && !order.stockAdjustedAt) {
      await inventoryService.reduceStockForOrder(order, tx);
    } else if (persistedStatus === "PENDING" && order.stockAdjustedAt) {
      if (order.stockAdjustedAt) {
        await inventoryService.restoreStockForOrder(order, tx);
      }
    }

    return orderRepository.update(orderId, { status: persistedStatus }, tx);
  });

  return toOrderDto(updatedOrder);
};

const cancelOrder = async (orderId, user) => {
  if (!user?.id) throw new AppError("Authentication required.", 401);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await getOrderOrThrow(orderId, tx);
    assertOrderAccess(order, user);
    assertUserCanCancelOrder(order, user);

    if (order.stockAdjustedAt) {
      await inventoryService.restoreStockForOrder(order, tx);
    }

    return orderRepository.update(orderId, { status: "CANCELLED" }, tx);
  });

  return toOrderDto(updatedOrder);
};

module.exports = {
  createOrderFromCart,
  listOrdersForUser,
  listAllOrders,
  listAdminOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
};
