import { prisma } from "@/lib/prisma";

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

export type DashboardSummary = {
  activeCount: number;
  draftCount: number;
  archivedCount: number;
  recentJobs: DashboardJobRow[];
};

export async function getDashboardJobsSummary(orgId: string): Promise<DashboardSummary> {
  const [activeCount, draftCount, archivedCount, recentJobs] = await Promise.all([
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
  ]);

  const jobIds = recentJobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return { activeCount, draftCount, archivedCount, recentJobs: [] };
  }

  const [interviewsForJobs, evaluationsForJobs] = await Promise.all([
    prisma.interview.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, candidateId: true },
    }),
    prisma.evaluation.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, candidateId: true },
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
  };
}
