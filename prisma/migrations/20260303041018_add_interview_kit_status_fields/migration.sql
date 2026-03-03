-- CreateEnum
CREATE TYPE "InterviewKitStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "interviewKitLastError" TEXT,
ADD COLUMN     "interviewKitStatus" "InterviewKitStatus" NOT NULL DEFAULT 'NOT_STARTED';
