const toApiOrderStatus = (status) => {
  switch (status) {
    case "FULFILLED":
      return "DELIVERED";
    case "REFUNDED":
      return "CANCELLED";
    default:
      return status;
  }
};

const toOrderDto = (order) => {
  if (!order) return null;

  return {
    id: order.id,
    userId: order.userId,
    userEmail: order.userEmail,
    status: toApiOrderStatus(order.status),
    totalAmount: order.totalAmount == null ? null : Number(order.totalAmount),
    stripeSessionId: order.stripeSessionId ?? null,
    paymentIntentId: order.paymentIntentId ?? null,
    paidAt: order.paidAt ?? null,
    stockAdjustedAt: order.stockAdjustedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    user: order.user
      ? {
          id: order.user.id,
          email: order.user.email,
          role: order.user.role,
        }
      : undefined,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.title,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.price) * item.quantity,
      imageUrl: item.imageUrl,
    })),
    payment: order.payment
      ? {
          id: order.payment.id,
          provider: order.payment.provider,
          amount: Number(order.payment.amount),
          currency: order.payment.currency,
          status: order.payment.status,
          paidAt: order.payment.paidAt,
        }
      : null,
  };
};

module.exports = { toOrderDto };
