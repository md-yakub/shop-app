const app = require("./app");
const env = require("./config/env");
const prisma = require("./database/prisma");

const startServer = async () => {
  await prisma.$connect();

  const server = app.listen(env.PORT, () => {
    console.log(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
