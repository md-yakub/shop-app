const AppError = require("../../utils/AppError");
const inventoryRepository = require("./inventory.repository");

const assertCartStock = (cartItems) => {
  const insufficientItem = cartItems.find((item) => item.quantity > item.product.stock);
  if (insufficientItem) {
    throw new AppError(
      `Insufficient stock for product ${insufficientItem.product.title}.`,
      409
    );
  }
};

const reduceStockForOrder = async (order, client) => {
  if (order.stockAdjustedAt) return;

  for (const item of order.items) {
    const result = await client.product.updateMany({
      where: {
        id: item.productId,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (result.count !== 1) {
      throw new AppError(`Insufficient stock for product ${item.title}.`, 409);
    }

    await inventoryRepository.create(
      {
        productId: item.productId,
        quantityChange: -item.quantity,
        action: "ORDER_PLACED",
        reason: `Order ${order.id} paid`,
      },
      client
    );
  }

  await client.order.update({
    where: { id: order.id },
    data: { stockAdjustedAt: new Date() },
  });
};

const restoreStockForOrder = async (order, client) => {
  if (!order.stockAdjustedAt) return;

  for (const item of order.items) {
    await client.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity },
      },
    });

    await inventoryRepository.create(
      {
        productId: item.productId,
        quantityChange: item.quantity,
        action: "ORDER_CANCELLED",
        reason: `Order ${order.id} cancelled or failed`,
      },
      client
    );
  }

  await client.order.update({
    where: { id: order.id },
    data: { stockAdjustedAt: null },
  });
};

module.exports = {
  assertCartStock,
  reduceStockForOrder,
  restoreStockForOrder,
};
