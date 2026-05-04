const productService = require("./product.service");
const { sendSuccess } = require("../../utils/apiResponse");

const listProducts = async (req, res) => {
  const { data, meta } = await productService.listProducts(req.query);
  return sendSuccess(res, data, "Products fetched.", 200, meta);
};

const listMyProducts = async (req, res) => {
  const { data, meta } = await productService.listMyProducts(req.query, req.user);
  return sendSuccess(res, data, "Products fetched.", 200, meta);
};

const listAdminProducts = async (req, res) => {
  const { data, meta } = await productService.listAdminProducts(req.query);
  return sendSuccess(res, data, "Products fetched.", 200, meta);
};

const getProduct = async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  return sendSuccess(res, product, "Product fetched.");
};

const createProduct = async (req, res) => {
  const product = await productService.createProduct(req.body, req.user);
  return sendSuccess(res, product, "Product created.", 201);
};

const updateProduct = async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user);
  return sendSuccess(res, product, "Product updated.");
};

const deleteProduct = async (req, res) => {
  await productService.deleteProduct(req.params.id, req.user);
  return sendSuccess(res, null, "Product deleted.");
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
