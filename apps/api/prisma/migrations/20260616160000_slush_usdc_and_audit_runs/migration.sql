-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Subscription_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripePriceId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "lastPaymentTx" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ALTER COLUMN "auditsLimit" SET DEFAULT 3;

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletAddress" TEXT NOT NULL,
    "totalCostUsdc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escrowId" TEXT,
    "txDigest" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRunFile" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "overallRisk" TEXT NOT NULL,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "markdown" TEXT NOT NULL,
    "auditJson" JSONB,

    CONSTRAINT "AuditRunFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditRun_walletAddress_idx" ON "AuditRun"("walletAddress");

-- CreateIndex
CREATE INDEX "AuditRun_createdAt_idx" ON "AuditRun"("createdAt");

-- CreateIndex
CREATE INDEX "AuditRunFile_runId_idx" ON "AuditRunFile"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_walletAddress_key" ON "Subscription"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_lastPaymentTx_key" ON "Subscription"("lastPaymentTx");

-- AddForeignKey
ALTER TABLE "AuditRunFile" ADD CONSTRAINT "AuditRunFile_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

