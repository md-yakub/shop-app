const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

const User = require("../models/user");

/**
 * Email transporter (SMTP)
 * Example: Gmail, Mailtrap, Outlook, etc.
 * Configure in .env
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =======================
   GET LOGIN
======================= */
exports.getLogin = (req, res) => {
  const message = req.flash("error")[0] || null;

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: { email: "", password: "" },
    validationErrors: [],
  });
};

/* =======================
   GET SIGNUP
======================= */
exports.getSignup = (req, res) => {
  const message = req.flash("error")[0] || null;

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: { email: "", password: "", confirmPassword: "" },
    validationErrors: [],
  });
};

/* =======================
   POST LOGIN
======================= */
exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password },
      validationErrors: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password.",
        oldInput: { email, password },
        validationErrors: [],
      });
    }

    const doMatch = await bcrypt.compare(password, user.password);
    if (!doMatch) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password.",
        oldInput: { email, password },
        validationErrors: [],
      });
    }

    req.session.isLoggedIn = true;
    req.session.user = user;
    await req.session.save();

    res.redirect("/");
  } catch (err) {
    next(err);
  }
};

/* =======================
   POST SIGNUP
======================= */
exports.postSignup = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email,
      password: hashedPassword,
      cart: { items: [] },
    });

    await user.save();
    res.redirect("/login");

    // Optional email
    // await transporter.sendMail({
    //   to: email,
    //   from: process.env.MAIL_FROM,
    //   subject: "Signup successful",
    //   html: "<h1>Welcome!</h1>",
    // });
  } catch (err) {
    next(err);
  }
};

/* =======================
   POST LOGOUT
======================= */
exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

/* =======================
   GET RESET
======================= */
exports.getReset = (req, res) => {
  const message = req.flash("error")[0] || null;

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

/* =======================
   POST RESET
======================= */
exports.postReset = async (req, res, next) => {
  try {
    const buffer = await crypto.randomBytes(32);
    const token = buffer.toString("hex");

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error", "No account with that email found.");
      return res.redirect("/reset");
    }

    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    res.redirect("/");

    await transporter.sendMail({
      to: req.body.email,
      from: process.env.MAIL_FROM,
      subject: "Password reset",
      html: `
        <p>You requested a password reset</p>
        <p>
          Click this 
          <a href="http://localhost:3000/reset/${token}">
            link
          </a> 
          to set a new password.
        </p>
      `,
    });
  } catch (err) {
    next(err);
  }
};

/* =======================
   GET NEW PASSWORD
======================= */
exports.getNewPassword = async (req, res, next) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Token is invalid or expired.");
      return res.redirect("/reset");
    }

    const message = req.flash("error")[0] || null;

    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token,
    });
  } catch (err) {
    next(err);
  }
};

/* =======================
   POST NEW PASSWORD
======================= */
exports.postNewPassword = async (req, res, next) => {
  const { password, userId, passwordToken } = req.body;

  try {
    const user = await User.findOne({
      _id: userId,
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Token is invalid or expired.");
      return res.redirect("/reset");
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;

    await user.save();
    res.redirect("/login");
  } catch (err) {
    next(err);
  }
};
