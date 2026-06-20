-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE INDEX "Audit_walletAddress_idx" ON "Audit"("walletAddress");
