/*
  Warnings:

  - You are about to drop the column `jobId` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `resumeUrl` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `interviewId` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `jobs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orgId,jobId,candidateId]` on the table `evaluations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Made the column `jobId` on table `evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `candidateId` on table `evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jobId` on table `interviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `candidateId` on table `interviews` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_jobId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_jobId_fkey";

-- DropForeignKey
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_jobId_fkey";

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "jobId",
DROP COLUMN "name",
DROP COLUMN "resumeUrl",
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "rawCVText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "feedback",
DROP COLUMN "interviewId",
DROP COLUMN "score",
ADD COLUMN     "finalScoreJson" JSONB,
ADD COLUMN     "signalsJson" JSONB,
ALTER COLUMN "jobId" SET NOT NULL,
ALTER COLUMN "candidateId" SET NOT NULL;

-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "scheduledAt",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "transcriptText" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "jobId" SET NOT NULL,
ALTER COLUMN "candidateId" SET NOT NULL;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "description",
ADD COLUMN     "rawJD" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "candidates_orgId_idx" ON "candidates"("orgId");

-- CreateIndex
CREATE INDEX "evaluations_orgId_idx" ON "evaluations"("orgId");

-- CreateIndex
CREATE INDEX "evaluations_jobId_idx" ON "evaluations"("jobId");

-- CreateIndex
CREATE INDEX "evaluations_candidateId_idx" ON "evaluations"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_orgId_jobId_candidateId_key" ON "evaluations"("orgId", "jobId", "candidateId");

-- CreateIndex
CREATE INDEX "interviews_orgId_idx" ON "interviews"("orgId");

-- CreateIndex
CREATE INDEX "interviews_jobId_idx" ON "interviews"("jobId");

-- CreateIndex
CREATE INDEX "interviews_candidateId_idx" ON "interviews"("candidateId");

-- CreateIndex
CREATE INDEX "jobs_orgId_idx" ON "jobs"("orgId");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
