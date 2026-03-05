-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "evaluations"
ADD COLUMN "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill completed evaluations
UPDATE "evaluations"
SET
  "status" = 'COMPLETED',
  "completedAt" = COALESCE("completedAt", "updatedAt")
WHERE "finalScoreJson" IS NOT NULL;

-- CreateIndex
CREATE INDEX "evaluations_orgId_status_completedAt_idx" ON "evaluations"("orgId", "status", "completedAt");
