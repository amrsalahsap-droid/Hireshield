-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('MANUAL', 'IMPORT', 'REFERRAL', 'APPLIED');

-- AlterTable
ALTER TABLE "job_candidates"
  ADD COLUMN "source"  "AssignmentSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "addedBy" TEXT,
  ADD COLUMN "notes"   TEXT;
