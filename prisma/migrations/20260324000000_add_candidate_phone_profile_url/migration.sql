-- AlterTable
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "profileUrl" TEXT;
