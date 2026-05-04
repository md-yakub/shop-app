const authService = require("./auth.service");
const { sendSuccess } = require("../../utils/apiResponse");

const register = async (req, res) => {
  const result = await authService.register(req.body);
  return sendSuccess(res, result, "Registered successfully.", 201);
};

const login = async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, "Logged in successfully.");
};

const refresh = async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  return sendSuccess(res, result, "Token refreshed.");
};

const logout = async (req, res) => {
  await authService.logout(req.body.refreshToken);
  return sendSuccess(res, null, "Logged out successfully.");
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
