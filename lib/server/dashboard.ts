import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type JDAnalysisStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";
export type InterviewKitStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";

export type DashboardJobRow = {
  id: string;
  title: string;
  seniority: string;
  candidateCount: number;
  jdAnalysisStatus: JDAnalysisStatus;
  interviewKitStatus: InterviewKitStatus;
  href: string;
};

export type AwaitingEvaluationRow = {
  evaluationId: string;
  candidateName: string;
  jobTitle: string;
  stage: "Interviewed" | "Awaiting Interview";
  hasTranscript: boolean;
  evaluationStatus: "Pending";
  href: string;
};

export type DashboardSummary = {
  activeCount: number;
  draftCount: number;
  archivedCount: number;
  recentJobs: DashboardJobRow[];
  candidatesAwaitingEvaluation: AwaitingEvaluationRow[];
};

export async function getDashboardJobsSummary(orgId: string): Promise<DashboardSummary> {
  const [activeCount, draftCount, archivedCount, recentJobs, pendingEvaluations] = await Promise.all([
    prisma.job.count({ where: { orgId, status: "ACTIVE" } }),
    prisma.job.count({ where: { orgId, status: "DRAFT" } }),
    prisma.job.count({ where: { orgId, status: "ARCHIVED" } }),
    prisma.job.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        jdExtractionJson: true,
        jdAnalysisStatus: true,
        interviewKitStatus: true,
      },
    }),
    prisma.evaluation.findMany({
      where: {
        orgId,
        OR: [
          { signalsJson: { equals: Prisma.AnyNull } },
          { finalScoreJson: { equals: Prisma.AnyNull } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        jobId: true,
        candidateId: true,
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    }),
  ]);

  const pendingPairs = pendingEvaluations.map((e) => ({
    jobId: e.jobId,
    candidateId: e.candidateId,
  }));
  const interviewsForPending = pendingPairs.length
    ? await prisma.interview.findMany({
        where: { orgId, OR: pendingPairs },
        select: { jobId: true, candidateId: true, transcriptText: true },
      })
    : [];
  const transcriptByPair = new Set(
    interviewsForPending
      .filter((i) => i.transcriptText.trim().length > 0)
      .map((i) => `${i.jobId}:${i.candidateId}`)
  );
  const candidatesAwaitingEvaluation: AwaitingEvaluationRow[] = pendingEvaluations.map((e) => {
    const key = `${e.jobId}:${e.candidateId}`;
    const hasTranscript = transcriptByPair.has(key);
    return {
      evaluationId: e.id,
      candidateName: e.candidate.fullName,
      jobTitle: e.job.title,
      stage: hasTranscript ? "Interviewed" : "Awaiting Interview",
      hasTranscript,
      evaluationStatus: "Pending",
      href: `/app/evaluations/${e.id}`,
    };
  });

  const jobIds = recentJobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return {
      activeCount,
      draftCount,
      archivedCount,
      recentJobs: [],
      candidatesAwaitingEvaluation,
    };
  }

  const [interviewsForJobs, evaluationsForJobs] = await Promise.all([
    prisma.interview.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, candidateId: true },
      distinct: ["jobId", "candidateId"],
    }),
    prisma.evaluation.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, candidateId: true },
      distinct: ["jobId", "candidateId"],
    }),
  ]);

  const candidateCountByJob = new Map<string, Set<string>>();
  for (const id of jobIds) candidateCountByJob.set(id, new Set());
  for (const i of interviewsForJobs) candidateCountByJob.get(i.jobId)!.add(i.candidateId);
  for (const e of evaluationsForJobs) candidateCountByJob.get(e.jobId)!.add(e.candidateId);

  const recentJobsWithMeta: DashboardJobRow[] = recentJobs.map((job) => {
    const jd = job.jdExtractionJson as { seniorityLevel?: string } | null;
    return {
      id: job.id,
      title: job.title,
      seniority: jd?.seniorityLevel ?? "—",
      candidateCount: candidateCountByJob.get(job.id)?.size ?? 0,
      jdAnalysisStatus: job.jdAnalysisStatus as JDAnalysisStatus,
      interviewKitStatus: job.interviewKitStatus as InterviewKitStatus,
      href: `/app/jobs/${job.id}`,
    };
  });

  return {
    activeCount,
    draftCount,
    archivedCount,
    recentJobs: recentJobsWithMeta,
    candidatesAwaitingEvaluation,
  };
}
