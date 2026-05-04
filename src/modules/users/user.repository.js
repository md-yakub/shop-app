const prisma = require("../../database/prisma");

const findById = (id, client = prisma) => {
  return client.user.findUnique({ where: { id } });
};

const findByEmail = (email, client = prisma) => {
  return client.user.findUnique({ where: { email } });
};

const findMany = (
  { where = undefined, skip = undefined, take = undefined, orderBy = { createdAt: "desc" } } = {},
  client = prisma
) => {
  return client.user.findMany({
    where,
    skip,
    take,
    orderBy,
  });
};

const count = ({ where = undefined } = {}, client = prisma) => {
  return client.user.count({ where });
};

const create = (data, client = prisma) => {
  return client.user.create({ data });
};

const update = (id, data, client = prisma) => {
  return client.user.update({
    where: { id },
    data,
  });
};

const createRefreshToken = (data, client = prisma) => {
  return client.refreshToken.create({ data });
};

const findActiveRefreshToken = (tokenHash, client = prisma) => {
  return client.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
};

const revokeRefreshToken = (id, client = prisma) => {
  return client.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
};

module.exports = {
  findById,
  findByEmail,
  findMany,
  count,
  create,
  update,
  createRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
};
