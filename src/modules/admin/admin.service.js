const prisma = require("../../database/prisma");
const { toOrderDto } = require("../orders/order.mapper");

const LOW_STOCK_THRESHOLD = 5;
const DB_ORDER_STATUS_VALUES = new Set(
  prisma?._runtimeDataModel?.enums?.OrderStatus?.values?.map((value) => value.name) || []
);
const PAID_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FULFILLED"].filter(
  (status) => DB_ORDER_STATUS_VALUES.has(status)
);

const getDashboardData = async () => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    paidOrders,
    cancelledOrders,
    lowStockProducts,
    recentOrders,
    recentPayments,
    revenueAggregate,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({
      where: {
        status: {
          in: PAID_ORDER_STATUSES,
        },
      },
    }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.product.count({ where: { stock: { lte: LOW_STOCK_THRESHOLD } } }),
    prisma.order.findMany({
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      include: {
        order: {
          select: {
            id: true,
            status: true,
            userEmail: true,
            totalAmount: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED" },
    }),
  ]);

  return {
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue: Number(revenueAggregate._sum.amount || 0),
    pendingOrders,
    paidOrders,
    cancelledOrders,
    lowStockProducts,
    recentOrders: recentOrders.map(toOrderDto),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      provider: payment.provider,
      providerSessionId: payment.providerSessionId,
      providerPaymentId: payment.providerPaymentId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      order: payment.order
        ? {
            id: payment.order.id,
            status: payment.order.status,
            userEmail: payment.order.userEmail,
            totalAmount:
              payment.order.totalAmount == null ? null : Number(payment.order.totalAmount),
          }
        : null,
      user: payment.user
        ? {
            id: payment.user.id,
            email: payment.user.email,
            role: payment.user.role,
          }
        : null,
    })),
  };
};

module.exports = {
  getDashboardData,
};
