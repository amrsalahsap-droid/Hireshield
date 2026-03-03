-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "rawModelOutputSnippet" TEXT,
ADD COLUMN     "signalsGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "signalsPromptVersion" TEXT;
