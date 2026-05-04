const AppError = require("../../utils/AppError");
const prisma = require("../../database/prisma");
const productRepository = require("./product.repository");
const { toProductDto } = require("./product.mapper");
const {
  parsePagination,
  buildPaginationMeta,
  parseSort,
  toOrderBy,
} = require("../../utils/query");

const PRODUCT_SORT_FIELDS = ["createdAt", "updatedAt", "price", "title", "stock"];
const PRODUCT_MODEL_FIELDS = new Set(
  prisma?._runtimeDataModel?.models?.Product?.fields?.map((field) => field.name) || []
);

const getListQueryOptions = (query = {}) => {
  const { page, limit, skip, take } = parsePagination(query, {
    page: 1,
    limit: 10,
  });
  const sort = parseSort(query.sort, PRODUCT_SORT_FIELDS, {
    field: "createdAt",
    direction: "desc",
  });

  return {
    page,
    limit,
    skip,
    take,
    orderBy: toOrderBy(sort),
  };
};

const buildProductWhere = (query = {}) => {
  const where = {};

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.categoryId && PRODUCT_MODEL_FIELDS.has("categoryId")) {
    where.categoryId = query.categoryId;
  }

  const minPrice = query.minPrice != null ? Number(query.minPrice) : null;
  const maxPrice = query.maxPrice != null ? Number(query.maxPrice) : null;

  if (minPrice != null || maxPrice != null) {
    where.price = {};

    if (minPrice != null) {
      where.price.gte = minPrice;
    }

    if (maxPrice != null) {
      where.price.lte = maxPrice;
    }
  }

  return where;
};

const listProducts = async (query) => {
  const { page, limit, skip, take, orderBy } = getListQueryOptions(query);
  const where = buildProductWhere(query);

  const [products, total] = await Promise.all([
    productRepository.findMany({ skip, take, where, orderBy }),
    productRepository.count({ where }),
  ]);

  return {
    data: products.map(toProductDto),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const listMyProducts = async (query, user) => {
  const { page, limit, skip, take, orderBy } = getListQueryOptions(query);
  const where = buildProductWhere(query);

  const [products, total] = await Promise.all([
    productRepository.findMany({
      ownerId: user.id,
      skip,
      take,
      where,
      orderBy,
    }),
    productRepository.count({ ownerId: user.id, where }),
  ]);

  return {
    data: products.map(toProductDto),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const listAdminProducts = async (query) => {
  const { page, limit, skip, take, orderBy } = getListQueryOptions(query);
  const where = buildProductWhere(query);

  const [products, total] = await Promise.all([
    productRepository.findMany({
      skip,
      take,
      where,
      orderBy,
      includeOwner: true,
    }),
    productRepository.count({ where }),
  ]);

  return {
    data: products.map((product) => toProductDto(product, { includeOwner: true })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const getProduct = async (id) => {
  const product = await productRepository.findById(id);
  if (!product) throw new AppError("Product not found.", 404);
  return toProductDto(product);
};

const normalizeCreatePayload = (payload) => {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
  const price = Number(payload.price);
  const stock = Number(payload.stock);

  if (!title || !description || !imageUrl) {
    throw new AppError("Invalid product create data.", 400);
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError("Invalid product create data.", 400);
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new AppError("Invalid product create data.", 400);
  }

  return {
    title,
    description,
    imageUrl,
    price,
    stock,
  };
};

const createProduct = async (payload, user) => {
  if (!user || !user.id) {
    throw new AppError("Authentication required.", 401);
  }

  const normalizedPayload = normalizeCreatePayload(payload);
  const ownerId = user.id;

  const product = await productRepository.create({
    title: normalizedPayload.title,
    price: normalizedPayload.price,
    description: normalizedPayload.description,
    imageUrl: normalizedPayload.imageUrl,
    stock: normalizedPayload.stock,
    ownerId,
  });

  return toProductDto(product);
};

const assertCanManageProduct = (product, user) => {
  if (user.role === "ADMIN") return;

  if (product.ownerId !== user.id) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
};

const updateProduct = async (id, payload, user) => {
  const existingProduct = await productRepository.findById(id);
  if (!existingProduct) throw new AppError("Product not found.", 404);

  assertCanManageProduct(existingProduct, user);

  const product = await productRepository.update(id, {
    title: payload.title,
    price: payload.price,
    description: payload.description,
    imageUrl: payload.imageUrl,
    stock: payload.stock,
  });

  return toProductDto(product);
};

const deleteProduct = async (id, user) => {
  const existingProduct = await productRepository.findById(id);
  if (!existingProduct) throw new AppError("Product not found.", 404);

  assertCanManageProduct(existingProduct, user);

  await productRepository.remove(id);
};

module.exports = {
  listProducts,
  listMyProducts,
  listAdminProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
