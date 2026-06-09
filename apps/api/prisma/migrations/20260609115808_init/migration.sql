-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('QUEUED', 'ANALYZING', 'STORING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractName" TEXT NOT NULL,
    "contractCode" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'QUEUED',
    "blobId" TEXT,
    "walrusUrl" TEXT,
    "overallRisk" "RiskLevel",
    "findingsJson" JSONB,
    "summaryJson" JSONB,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "infoCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_blobId_key" ON "Audit"("blobId");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt");
