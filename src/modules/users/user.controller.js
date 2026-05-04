const userService = require("./user.service");
const { sendSuccess } = require("../../utils/apiResponse");

const listUsers = async (req, res) => {
  const { data, meta } = await userService.listUsers(req.query);
  return sendSuccess(res, data, "Users fetched.", 200, meta);
};

const getMe = async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return sendSuccess(res, user, "Current user fetched.");
};

module.exports = {
  listUsers,
  getMe,
};
