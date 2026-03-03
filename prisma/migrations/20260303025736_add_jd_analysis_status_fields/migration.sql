-- CreateEnum
CREATE TYPE "JDAnalysisStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "jdAnalysisStatus" "JDAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "jdLastError" TEXT;

-- CreateIndex
CREATE INDEX "jobs_jdAnalyzedAt_idx" ON "jobs"("jdAnalyzedAt");
