-- AlterTable
ALTER TABLE "ContractAudit" ADD COLUMN     "contractHash" TEXT;

-- CreateIndex
CREATE INDEX "ContractAudit_contractHash_idx" ON "ContractAudit"("contractHash");
