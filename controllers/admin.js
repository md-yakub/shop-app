const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const Product = require("../models/product");
const fileHelper = require("../util/file");

/* =========================
   GET ADD PRODUCT
========================= */
exports.getAddProduct = (req, res) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    product: {},
    errorMessage: null,
    validationErrors: [],
  });
};

/* =========================
   POST ADD PRODUCT
========================= */
exports.postAddProduct = async (req, res, next) => {
  try {
    const { title, price, description } = req.body;
    const image = req.file;

    if (!image) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        hasError: true,
        product: { title, price, description },
        errorMessage: "Attached file is not an image.",
        validationErrors: [],
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        hasError: true,
        product: { title, price, description },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array(),
      });
    }

    const product = new Product({
      title,
      price,
      description,
      imageUrl: image.path,
      userId: req.user._id,
    });

    await product.save();
    console.log("Created Product");
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET EDIT PRODUCT
========================= */
exports.getEditProduct = async (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) return res.redirect("/");

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.redirect("/");

    res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: editMode,
      product,
      hasError: false,
      errorMessage: null,
      validationErrors: [],
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   POST EDIT PRODUCT
========================= */
exports.postEditProduct = async (req, res, next) => {
  try {
    const { productId, title, price, description } = req.body;
    const image = req.file;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: true,
        hasError: true,
        product: { _id: productId, title, price, description },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array(),
      });
    }

    const product = await Product.findById(productId);
    if (!product) return res.redirect("/");

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.redirect("/");
    }

    product.title = title;
    product.price = price;
    product.description = description;

    if (image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }

    await product.save();
    console.log("UPDATED PRODUCT");
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

/* =========================
   GET ADMIN PRODUCTS
========================= */
exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ userId: req.user._id });
    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   DELETE PRODUCT (AJAX)
========================= */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }

    fileHelper.deleteFile(product.imageUrl);
    await Product.deleteOne({ _id: product._id });

    console.log("DESTROYED PRODUCT");
    res.status(200).json({ message: "Success!" });
  } catch (err) {
    res.status(500).json({ message: "Deleting product failed." });
  }
};
