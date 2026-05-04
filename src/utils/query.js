const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

const parsePagination = (query = {}, defaults = {}) => {
  const page = toPositiveInt(query.page, defaults.page || DEFAULT_PAGE);
  const limit = Math.min(
    toPositiveInt(query.limit, defaults.limit || DEFAULT_LIMIT),
    MAX_LIMIT
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;

  return {
    page,
    limit,
    total: safeTotal,
    totalPages: safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit),
  };
};

const parseSort = (
  sortValue,
  allowedFields = [],
  fallback = { field: "createdAt", direction: "desc" }
) => {
  if (typeof sortValue !== "string" || !sortValue.trim()) {
    return fallback;
  }

  const [rawField, rawDirection] = sortValue.split(":");
  const field = rawField?.trim();
  const direction = rawDirection?.trim()?.toLowerCase() === "asc" ? "asc" : "desc";

  if (!field || !allowedFields.includes(field)) {
    return fallback;
  }

  return { field, direction };
};

const toOrderBy = (sort) => ({
  [sort.field]: sort.direction,
});

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  buildPaginationMeta,
  parseSort,
  toOrderBy,
};

