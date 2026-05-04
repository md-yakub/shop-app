const toCartDto = (items) => {
  const mappedItems = items.map((item) => {
    const price = Number(item.product.price);
    const subtotal = price * item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      subtotal,
      product: {
        id: item.product.id,
        title: item.product.title,
        price,
        description: item.product.description,
        imageUrl: item.product.imageUrl,
        stock: item.product.stock,
      },
    };
  });

  return {
    items: mappedItems,
    total: mappedItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
};

module.exports = { toCartDto };
