-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "jdAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "jdExtractionJson" JSONB,
ADD COLUMN     "jdPromptVersion" TEXT;
