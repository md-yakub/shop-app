const prisma = require("../../database/prisma");

const ownerSelection = {
  id: true,
  email: true,
  role: true,
};

const findMany = (
  {
    skip = 0,
    take = 10,
    ownerId = undefined,
    includeOwner = false,
    where = undefined,
    orderBy = { createdAt: "desc" },
  } = {},
  client = prisma
) => {
  const mergedWhere = {
    ...(where || {}),
    ...(ownerId ? { ownerId } : {}),
  };

  return client.product.findMany({
    where: mergedWhere,
    skip,
    take,
    orderBy,
    include: includeOwner ? { owner: { select: ownerSelection } } : undefined,
  });
};

const count = ({ ownerId = undefined, where = undefined } = {}, client = prisma) => {
  const mergedWhere = {
    ...(where || {}),
    ...(ownerId ? { ownerId } : {}),
  };

  return client.product.count({
    where: mergedWhere,
  });
};

const findById = (id, { includeOwner = false } = {}, client = prisma) => {
  return client.product.findUnique({
    where: { id },
    include: includeOwner ? { owner: { select: ownerSelection } } : undefined,
  });
};

const create = (data, client = prisma) => {
  const createData = {
    title: data.title,
    price: data.price,
    description: data.description,
    imageUrl: data.imageUrl,
    stock: data.stock,
    owner: {
      connect: { id: data.ownerId },
    },
  };

  return client.product.create({ data: createData });
};

const update = (id, data, client = prisma) => {
  return client.product.update({
    where: { id },
    data,
  });
};

const remove = (id, client = prisma) => {
  return client.product.delete({ where: { id } });
};

module.exports = {
  findMany,
  count,
  findById,
  create,
  update,
  remove,
};
