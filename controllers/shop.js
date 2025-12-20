const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

/* =========================
   GET PRODUCTS (PAGINATED)
========================= */
exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const totalItems = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("shop/product-list", {
      prods: products,
      pageTitle: "Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET SINGLE PRODUCT
========================= */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.redirect("/");

    res.render("shop/product-detail", {
      product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET INDEX (HOME)
========================= */
exports.getIndex = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const totalItems = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET CART
========================= */
exports.getCart = async (req, res, next) => {
  try {
    await req.user.populate("cart.items.productId");

    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: req.user.cart.items,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   POST CART (ADD ITEM)
========================= */
exports.postCart = async (req, res, next) => {
  try {
    const product = await Product.findById(req.body.productId);
    await req.user.addToCart(product);
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

/* =========================
   DELETE CART ITEM
========================= */
exports.postCartDeleteProduct = async (req, res, next) => {
  try {
    await req.user.removeFromCart(req.body.productId);
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET CHECKOUT
========================= */
exports.getCheckout = async (req, res, next) => {
  try {
    await req.user.populate("cart.items.productId");

    let total = 0;
    req.user.cart.items.forEach((item) => {
      total += item.quantity * item.productId.price;
    });

    res.render("shop/checkout", {
      path: "/checkout",
      pageTitle: "Checkout",
      products: req.user.cart.items,
      totalSum: total,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   POST ORDER
========================= */
exports.postOrder = async (req, res, next) => {
  try {
    await req.user.populate("cart.items.productId");

    const lineItems = req.user.cart.items.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.productId.title,
            description: item.productId.description,
          },
          unit_amount: Math.round(item.productId.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: "http://localhost:3000/checkout/success",
      cancel_url: "http://localhost:3000/checkout/cancel",
    });

    res.redirect(303, session.url);
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET ORDERS
========================= */
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id });
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET INVOICE (PDF)
========================= */
exports.getInvoice = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) throw new Error("Order not found");
    if (order.user.userId.toString() !== req.user._id.toString()) {
      throw new Error("Unauthorized");
    }

    const invoiceName = `invoice-${order._id}.pdf`;
    const invoicePath = path.join("data", "invoices", invoiceName);

    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text("Invoice", { underline: true });
    pdfDoc.moveDown();

    let totalPrice = 0;
    order.products.forEach((p) => {
      totalPrice += p.quantity * p.product.price;
      pdfDoc.text(`${p.product.title} - ${p.quantity} x $${p.product.price}`);
    });

    pdfDoc.moveDown();
    pdfDoc.fontSize(20).text(`Total: $${totalPrice}`);
    pdfDoc.end();
  } catch (err) {
    next(err);
  }
};

exports.getCheckoutSuccess = async (req, res, next) => {
  try {
    await req.user.populate("cart.items.productId");

    const products = req.user.cart.items.map(item => {
      return {
        quantity: item.quantity,
        product: { ...item.productId._doc }
      };
    });

    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user._id
      },
      products: products
    });

    await order.save();
    await req.user.clearCart();

    res.redirect("/orders");
  } catch (err) {
    next(err);
  }
};

