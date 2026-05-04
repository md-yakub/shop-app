const prisma = require("../../database/prisma");

const create = (data, client = prisma) => {
  return client.inventoryLog.create({ data });
};

const findByProductId = (productId, client = prisma) => {
  return client.inventoryLog.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  create,
  findByProductId,
};
