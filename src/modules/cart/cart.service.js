const AppError = require("../../utils/AppError");
const productRepository = require("../products/product.repository");
const cartRepository = require("./cart.repository");
const { toCartDto } = require("./cart.mapper");

const getCart = async (userId) => {
  const items = await cartRepository.getItemsByUserId(userId);
  return toCartDto(items);
};

const assertProductCanBeAdded = async (userId, productId, quantity) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError("Product not found.", 404);

  const existingItem = await cartRepository.findByUserAndProduct(userId, productId);
  const requestedQuantity = (existingItem?.quantity || 0) + quantity;

  if (requestedQuantity > product.stock) {
    throw new AppError("Insufficient stock for this product.", 409);
  }

  return product;
};

const addItem = async (userId, productId, quantity = 1) => {
  if (quantity < 1) throw new AppError("Quantity must be at least 1.", 422);

  await assertProductCanBeAdded(userId, productId, quantity);
  await cartRepository.upsertItem(userId, productId, quantity);

  return getCart(userId);
};

const updateItem = async (userId, productId, quantity) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError("Product not found.", 404);

  const existingItem = await cartRepository.findByUserAndProduct(userId, productId);
  if (!existingItem) throw new AppError("Cart item not found.", 404);

  if (quantity <= 0) {
    await cartRepository.removeByProduct(userId, productId);
    return getCart(userId);
  }

  if (quantity > product.stock) {
    throw new AppError("Insufficient stock for this product.", 409);
  }

  await cartRepository.setQuantity(userId, productId, quantity);
  return getCart(userId);
};

const removeItem = async (userId, productId) => {
  const existingItem = await cartRepository.findByUserAndProduct(userId, productId);
  if (!existingItem) throw new AppError("Cart item not found.", 404);

  await cartRepository.removeByProduct(userId, productId);
  return getCart(userId);
};

const clearCart = async (userId) => {
  await cartRepository.clearByUserId(userId);
  return getCart(userId);
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
