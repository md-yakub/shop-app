const userRepository = require("./user.repository");
const { toPublicUser } = require("./user.mapper");
const { parsePagination, parseSort, toOrderBy, buildPaginationMeta } = require("../../utils/query");

const USER_SORT_FIELDS = ["createdAt", "updatedAt", "email", "role"];

const listUsers = async (query = {}) => {
  const { page, limit, skip, take } = parsePagination(query, {
    page: 1,
    limit: 10,
  });
  const sort = parseSort(query.sort, USER_SORT_FIELDS, {
    field: "createdAt",
    direction: "desc",
  });

  const where = {};
  if (query.search) {
    where.email = { contains: query.search, mode: "insensitive" };
  }

  if (query.role) {
    where.role = String(query.role).trim().toUpperCase();
  }

  const [users, total] = await Promise.all([
    userRepository.findMany({
      where,
      skip,
      take,
      orderBy: toOrderBy(sort),
    }),
    userRepository.count({ where }),
  ]);

  return {
    data: users.map(toPublicUser),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const getUserById = async (id) => {
  const user = await userRepository.findById(id);
  return toPublicUser(user);
};

module.exports = {
  listUsers,
  getUserById,
};
