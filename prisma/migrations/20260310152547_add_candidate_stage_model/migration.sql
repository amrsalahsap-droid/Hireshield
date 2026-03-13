-- CreateEnum
CREATE TYPE "CandidateStage" AS ENUM ('ADDED', 'AWAITING_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'EVALUATION_PENDING', 'EVALUATED', 'DECISION_MADE');

-- CreateTable
CREATE TABLE "job_candidates" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" "CandidateStage" NOT NULL DEFAULT 'ADDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_candidates_jobId_stage_idx" ON "job_candidates"("jobId", "stage");

-- CreateIndex
CREATE INDEX "job_candidates_candidateId_idx" ON "job_candidates"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "job_candidates_jobId_candidateId_key" ON "job_candidates"("jobId", "candidateId");

-- AddForeignKey
ALTER TABLE "job_candidates" ADD CONSTRAINT "job_candidates_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_candidates" ADD CONSTRAINT "job_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
