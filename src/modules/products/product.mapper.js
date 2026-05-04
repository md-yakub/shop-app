const toProductDto = (product, options = {}) => {
  if (!product) return null;
  const includeOwner = Boolean(options.includeOwner);
  const ownerId = product.ownerId;

  const dto = {
    id: product.id,
    title: product.title,
    price: Number(product.price),
    description: product.description,
    imageUrl: product.imageUrl,
    stock: product.stock,
    ownerId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  if (includeOwner && product.owner) {
    dto.owner = {
      id: product.owner.id,
      email: product.owner.email,
      role: product.owner.role,
    };
  }

  return dto;
};

module.exports = { toProductDto };
