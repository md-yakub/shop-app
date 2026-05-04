const prisma = require("../../database/prisma");

const create = (data, client = prisma) => {
  return client.payment.create({ data });
};

const findById = (id, client = prisma) => {
  return client.payment.findUnique({ where: { id } });
};

const findByOrderId = (orderId, client = prisma) => {
  return client.payment.findUnique({ where: { orderId } });
};

const findByProviderSessionId = (providerSessionId, client = prisma) => {
  return client.payment.findUnique({ where: { providerSessionId } });
};

const findByProviderPaymentId = (providerPaymentId, client = prisma) => {
  return client.payment.findUnique({ where: { providerPaymentId } });
};

const update = (id, data, client = prisma) => {
  return client.payment.update({
    where: { id },
    data,
  });
};

const findWebhookEvent = (id, client = prisma) => {
  return client.stripeWebhookEvent.findUnique({ where: { id } });
};

const createWebhookEvent = (data, client = prisma) => {
  return client.stripeWebhookEvent.create({ data });
};

const markWebhookEventProcessed = (id, client = prisma) => {
  return client.stripeWebhookEvent.update({
    where: { id },
    data: { processedAt: new Date() },
  });
};

module.exports = {
  create,
  findById,
  findByOrderId,
  findByProviderSessionId,
  findByProviderPaymentId,
  update,
  findWebhookEvent,
  createWebhookEvent,
  markWebhookEventProcessed,
};
