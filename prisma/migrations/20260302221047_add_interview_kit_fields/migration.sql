-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "interviewKitGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "interviewKitJson" JSONB,
ADD COLUMN     "interviewKitPromptVersion" TEXT;
