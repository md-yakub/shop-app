const prisma = require("../../database/prisma");

const includeOrderDetails = {
  user: true,
  items: {
    include: {
      product: true,
    },
  },
  payment: true,
};

const findById = (id, client = prisma) => {
  return client.order.findUnique({
    where: { id },
    include: includeOrderDetails,
  });
};

const findByUserId = (userId, client = prisma) => {
  return client.order.findMany({
    where: { userId },
    include: includeOrderDetails,
    orderBy: { createdAt: "desc" },
  });
};

const findAll = (client = prisma) => {
  return client.order.findMany({
    include: includeOrderDetails,
    orderBy: { createdAt: "desc" },
  });
};

const findManyAdmin = (
  { where = undefined, orderBy = { createdAt: "desc" }, skip = 0, take = 10 } = {},
  client = prisma
) => {
  return client.order.findMany({
    where,
    include: includeOrderDetails,
    orderBy,
    skip,
    take,
  });
};

const count = ({ where = undefined } = {}, client = prisma) => {
  return client.order.count({ where });
};

const createWithItems = ({ user, items, totalAmount }, client = prisma) => {
  return client.order.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      totalAmount,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          title: item.product.title,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.imageUrl,
        })),
      },
    },
    include: includeOrderDetails,
  });
};

const update = (id, data, client = prisma) => {
  return client.order.update({
    where: { id },
    data,
    include: includeOrderDetails,
  });
};

module.exports = {
  includeOrderDetails,
  findById,
  findByUserId,
  findAll,
  findManyAdmin,
  count,
  createWithItems,
  update,
};
