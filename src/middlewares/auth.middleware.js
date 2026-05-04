const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/AppError");
const userRepository = require("../modules/users/user.repository");

const authenticate = async (req, res, next) => {
  try {
    const header = req.get("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      throw new AppError("Authentication required.", 401);
    }

    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError("Authentication required.", 401);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired token.", 401));
    }
    return next(err);
  }
};

module.exports = authenticate;
