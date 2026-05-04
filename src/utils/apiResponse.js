const sendSuccess = (
  res,
  data = null,
  message = "OK",
  statusCode = 200,
  meta = undefined
) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess };
