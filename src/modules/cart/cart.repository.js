const prisma = require("../../database/prisma");

const getItemsByUserId = (userId, client = prisma) => {
  return client.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
};

const findByUserAndProduct = (userId, productId, client = prisma) => {
  return client.cartItem.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
    include: { product: true },
  });
};

const upsertItem = (userId, productId, quantity, client = prisma) => {
  return client.cartItem.upsert({
    where: {
      userId_productId: { userId, productId },
    },
    update: {
      quantity: { increment: quantity },
    },
    create: {
      userId,
      productId,
      quantity,
    },
    include: { product: true },
  });
};

const setQuantity = (userId, productId, quantity, client = prisma) => {
  return client.cartItem.update({
    where: {
      userId_productId: { userId, productId },
    },
    data: { quantity },
    include: { product: true },
  });
};

const removeByProduct = (userId, productId, client = prisma) => {
  return client.cartItem.delete({
    where: {
      userId_productId: { userId, productId },
    },
  });
};

const clearByUserId = (userId, client = prisma) => {
  return client.cartItem.deleteMany({ where: { userId } });
};

module.exports = {
  getItemsByUserId,
  findByUserAndProduct,
  upsertItem,
  setQuantity,
  removeByProduct,
  clearByUserId,
};
