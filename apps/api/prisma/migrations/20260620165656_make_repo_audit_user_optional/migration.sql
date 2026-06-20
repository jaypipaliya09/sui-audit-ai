-- DropForeignKey
ALTER TABLE "RepoAudit" DROP CONSTRAINT "RepoAudit_userId_fkey";

-- AlterTable
ALTER TABLE "RepoAudit" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RepoAudit" ADD CONSTRAINT "RepoAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
