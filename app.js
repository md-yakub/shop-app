require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const multer = require("multer");

const errorController = require("./controllers/error");
const shopController = require("./controllers/shop");
const isAuth = require("./middleware/is-auth");
const User = require("./models/user");

const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");
if (!SESSION_SECRET) throw new Error("Missing SESSION_SECRET in .env");

const app = express();

/**
 * Multer (file uploads)
 * - destination: where to store uploaded files
 * - filename: how files are named on disk
 * NOTE: Using Date.now() avoids Windows filename issues caused by ":" in ISO strings.
 */
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "images"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const ok =
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg";
  cb(null, ok);
};

/**
 * telling to express
 * View engine (server-side rendering)
 */
app.set("view engine", "ejs");
app.set("views", "views");

/**
 * Routes
 */
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

/**
 * Body parsing (built into Express now)
 */
app.use(express.urlencoded({ extended: false }));

/**
 * File uploads (multipart/form-data)
 * This expects your form field name to be "image"
 */
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));

/**
 * Static files
 */
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

/**
 * Sessions stored in MongoDB (modern replacement)
 * - cookie stores only session id
 * - session data lives in MongoDB
 */
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // enable in production behind HTTPS
    },
  })
);

/**
 * Flash messages (stored in session, survive one redirect)
 */
app.use(flash());

/**
 * Make authentication state available in all EJS views
 */
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.isLoggedIn;
  next();
});

/**
 * Attach the logged-in user document to req.user
 * Why? So controllers can do: req.user.addToCart(...)
 */
app.use(async (req, res, next) => {
  try {
    if (!req.session.user?._id) return next();
    const user = await User.findById(req.session.user._id);
    if (!user) return next();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * This route is placed BEFORE the route files in your original project.
 * It creates an order (Stripe logic is probably inside shopController.postOrder)
 */
app.post("/create-order", isAuth, shopController.postOrder);

/**
 * Mount routes
 */
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

/**
 * Error pages
 */
app.get("/500", errorController.get500);
app.use(errorController.get404);

/**
 * Central error handler (Express recognizes 4 args as error middleware)
 */
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: !!req.session.isLoggedIn,
  });
});

/**
 * Connect DB then start server
 */
mongoose
  .connect(MONGODB_URI)
  .then(() => app.listen(3000))
  .catch((err) => console.error(err));
