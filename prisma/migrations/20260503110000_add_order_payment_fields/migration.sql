ALTER TABLE "Order"
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "paymentIntentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);
