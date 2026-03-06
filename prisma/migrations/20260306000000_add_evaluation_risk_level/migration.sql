-- CreateEnum
CREATE TYPE "EvaluationRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN "riskLevel" "EvaluationRiskLevel";

-- Backfill riskLevel from finalScoreJson
UPDATE "evaluations"
SET "riskLevel" = CASE "finalScoreJson"->>'riskLevel'
  WHEN 'GREEN'  THEN 'LOW'::"EvaluationRiskLevel"
  WHEN 'YELLOW' THEN 'MEDIUM'::"EvaluationRiskLevel"
  WHEN 'RED'    THEN 'HIGH'::"EvaluationRiskLevel"
END
WHERE "finalScoreJson" IS NOT NULL;

-- CreateIndex
CREATE INDEX "evaluations_orgId_riskLevel_completedAt_idx" ON "evaluations"("orgId", "riskLevel", "completedAt" DESC NULLS LAST);
