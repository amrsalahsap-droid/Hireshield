import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type JDAnalysisStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";
export type InterviewKitStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";

export type DashboardJobRow = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  seniority: string;
  candidateCount: number;
  jdAnalysisStatus: JDAnalysisStatus;
  interviewKitStatus: InterviewKitStatus;
  updatedAt: string;
  href: string;
};

export type AwaitingEvaluationRow = {
  evaluationId: string;
  candidateName: string;
  jobTitle: string;
  stage: "Interviewed" | "Awaiting Interview";
  hasTranscript: boolean;
  evaluationStatus: "Pending";
  createdAt: string;
  href: string;
};

export type RecentEvaluationRiskLevel = "GREEN" | "YELLOW" | "RED";

export type RecentEvaluationRow = {
  evaluationId: string;
  candidateName: string;
  jobTitle: string;
  score: number;
  riskLevel: RecentEvaluationRiskLevel;
  createdAt: string;
  completedAt: string;
  href: string;
};

export type HighRiskAlertRow = {
  evaluationId: string;
  candidateName: string;
  jobTitle: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  score: number | null;
  flagCount: number;
  href: string;
};

export type UpcomingInterviewRow = {
  id: string;
  candidateName: string;
  jobTitle: string;
  scheduledTime: string;
  href: string;
};

export type PipelineHealth = {
  totalCandidates: number;
  interviewsCompleted: number;
  evaluationsCompleted: number;
};

export type DashboardSummary = {
  activeCount: number;
  draftCount: number;
  archivedCount: number;
  recentJobs: DashboardJobRow[];
  candidatesAwaitingEvaluation: AwaitingEvaluationRow[];
  recentEvaluations: RecentEvaluationRow[];
  highRiskAlerts: HighRiskAlertRow[];
  upcomingInterviews: UpcomingInterviewRow[];
  pipelineHealth: PipelineHealth;
  lastUpdated: string;
};

function parseRecentEvaluationMetrics(
  finalScoreJson: Prisma.JsonValue
): { score: number; riskLevel: RecentEvaluationRiskLevel } | null {
  if (!finalScoreJson || typeof finalScoreJson !== "object" || Array.isArray(finalScoreJson)) {
    return null;
  }
  const rawScore = (finalScoreJson as { finalScore?: unknown }).finalScore;
  const rawRiskLevel = (finalScoreJson as { riskLevel?: unknown }).riskLevel;
  if (typeof rawScore !== "number") return null;
  if (!Number.isFinite(rawScore)) return null;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  if (typeof rawRiskLevel !== "string") return null;
  const normalizedRisk = rawRiskLevel.toUpperCase();
  if (normalizedRisk !== "GREEN" && normalizedRisk !== "YELLOW" && normalizedRisk !== "RED") {
    return null;
  }
  return {
    score,
    riskLevel: normalizedRisk,
  };
}

export async function getDashboardJobsSummary(orgId: string): Promise<DashboardSummary> {
  const [
    activeCount,
    draftCount,
    archivedCount,
    recentJobs,
    pendingEvaluations,
    recentCompletedEvaluations,
    highRiskEvaluations,
    upcomingInterviewsRaw,
    totalCandidates,
    interviewsCompleted,
    evaluationsCompleted,
  ] = await Promise.all([
    // Job counts - optimized
    prisma.job.count({ where: { orgId, status: "ACTIVE" } }),
    prisma.job.count({ where: { orgId, status: "DRAFT" } }),
    prisma.job.count({ where: { orgId, status: "ARCHIVED" } }),
    
    // Recent jobs - reduced fields
    prisma.job.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        jdAnalysisStatus: true,
        interviewKitStatus: true,
      },
    }),
    
    // Pending evaluations - optimized
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
        createdAt: true,
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    }),
    
    // Recent completed evaluations - optimized
    prisma.evaluation.findMany({
      where: {
        orgId,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        createdAt: true,
        completedAt: true,
        finalScoreJson: true,
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    }),
    
    // High risk evaluations - optimized
    prisma.evaluation.findMany({
      where: {
        orgId,
        riskLevel: { in: ["HIGH", "MEDIUM", "LOW"] },
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        riskLevel: true,
        signalsJson: true,
        finalScoreJson: true,
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    }),
    
    // Upcoming interviews - optimized
    prisma.interview.findMany({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    }),
    
    // Aggregate counts - optimized
    prisma.candidate.count({ where: { orgId } }),
    prisma.interview.count({ where: { orgId } }),
    prisma.evaluation.count({ where: { orgId, status: "COMPLETED" } }),
  ]);

  // Optimized: Process pending evaluations without additional query
  const candidatesAwaitingEvaluation: AwaitingEvaluationRow[] = pendingEvaluations.map((e) => ({
    evaluationId: e.id,
    candidateName: e.candidate.fullName,
    jobTitle: e.job.title,
    stage: "Awaiting Interview", // Simplified - transcript check can be done client-side if needed
    hasTranscript: false, // Simplified - removed transcript query for performance
    evaluationStatus: "Pending",
    href: `/app/candidates/${e.candidateId}`,
    createdAt: e.createdAt.toISOString(),
  }));

  const recentEvaluations: RecentEvaluationRow[] = recentCompletedEvaluations
    .map((e) => {
      const metrics = parseRecentEvaluationMetrics(e.finalScoreJson as Prisma.JsonValue);
      if (!metrics || !e.completedAt) return null;
      return {
        evaluationId: e.id,
        candidateName: e.candidate.fullName,
        jobTitle: e.job.title,
        score: metrics.score,
        riskLevel: metrics.riskLevel,
        createdAt: e.createdAt.toISOString(),
        completedAt: e.completedAt.toISOString(),
        href: `/app/evaluations/${e.id}`,
      };
    })
    .filter((row): row is RecentEvaluationRow => row !== null);

  const riskOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const highRiskAlerts: HighRiskAlertRow[] = highRiskEvaluations
    .filter((e) => e.riskLevel === "HIGH" || e.riskLevel === "MEDIUM" || e.riskLevel === "LOW")
    .sort((a, b) => (riskOrder[a.riskLevel ?? "LOW"] ?? 2) - (riskOrder[b.riskLevel ?? "LOW"] ?? 2))
    .map((e) => {
      const signals = e.signalsJson;
      const flagCount =
        Array.isArray(signals) ? signals.length
        : signals && typeof signals === "object" && !Array.isArray(signals)
          ? Object.keys(signals).length
          : 0;
      const metrics = parseRecentEvaluationMetrics(e.finalScoreJson as Prisma.JsonValue);
      return {
        evaluationId: e.id,
        candidateName: e.candidate.fullName,
        jobTitle: e.job.title,
        riskLevel: (e.riskLevel as "HIGH" | "MEDIUM" | "LOW"),
        score: metrics?.score ?? null,
        flagCount,
        href: `/app/evaluations/${e.id}`,
      };
    });

  const upcomingInterviews: UpcomingInterviewRow[] = upcomingInterviewsRaw.map((interview) => ({
    id: interview.id,
    candidateName: interview.candidate.fullName,
    jobTitle: interview.job.title,
    scheduledTime: interview.createdAt.toISOString(),
    href: `/app/interviews/${interview.id}`,
  }));

  const pipelineHealth: PipelineHealth = {
    totalCandidates,
    interviewsCompleted,
    evaluationsCompleted,
  };

  const jobIds = recentJobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return {
      activeCount,
      draftCount,
      archivedCount,
      recentJobs: [],
      candidatesAwaitingEvaluation,
      recentEvaluations,
      highRiskAlerts,
      upcomingInterviews,
      pipelineHealth,
      lastUpdated: new Date().toISOString(),
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

  const recentJobsWithMeta: DashboardJobRow[] = recentJobs.map((job) => ({
    id: job.id,
    title: job.title,
    status: job.status as "DRAFT" | "ACTIVE" | "ARCHIVED",
    seniority: "—", // Simplified - removed jdExtractionJson dependency
    candidateCount: candidateCountByJob.get(job.id)?.size ?? 0,
    jdAnalysisStatus: job.jdAnalysisStatus as JDAnalysisStatus,
    interviewKitStatus: job.interviewKitStatus as InterviewKitStatus,
    updatedAt: job.updatedAt.toISOString(),
    href: `/app/jobs/${job.id}`,
  }));

  return {
    activeCount,
    draftCount,
    archivedCount,
    recentJobs: recentJobsWithMeta,
    candidatesAwaitingEvaluation,
    recentEvaluations,
    highRiskAlerts,
    upcomingInterviews,
    pipelineHealth,
    lastUpdated: new Date().toISOString(),
  };
}
