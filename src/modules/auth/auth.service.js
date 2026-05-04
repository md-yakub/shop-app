const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const AppError = require("../../utils/AppError");
const userRepository = require("../users/user.repository");
const { toPublicUser } = require("../users/user.mapper");

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getRefreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
};

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await userRepository.createRefreshToken({
    tokenHash: hashRefreshToken(refreshToken),
    userId: user.id,
    expiresAt: getRefreshExpiry(),
  });

  return { accessToken, refreshToken };
};

const register = async ({ email, password }) => {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw new AppError("Email is already registered.", 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await userRepository.create({
    email,
    password: hashedPassword,
    role: "USER",
  });

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
};

const login = async ({ email, password }) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError("Invalid email or password.", 401);

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) throw new AppError("Invalid email or password.", 401);

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) throw new AppError("Refresh token is required.", 400);

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  if (payload.type !== "refresh") {
    throw new AppError("Invalid refresh token.", 401);
  }

  const storedToken = await userRepository.findActiveRefreshToken(
    hashRefreshToken(refreshToken)
  );

  if (!storedToken || storedToken.userId !== payload.sub) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  await userRepository.revokeRefreshToken(storedToken.id);
  const tokens = await issueTokens(storedToken.user);

  return {
    user: toPublicUser(storedToken.user),
    ...tokens,
  };
};

const logout = async (refreshToken) => {
  if (!refreshToken) return;

  const storedToken = await userRepository.findActiveRefreshToken(
    hashRefreshToken(refreshToken)
  );

  if (storedToken) {
    await userRepository.revokeRefreshToken(storedToken.id);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
