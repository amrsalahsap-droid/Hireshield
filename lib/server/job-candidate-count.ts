import { prisma } from "@/lib/prisma";

/**
 * Returns assignment counts per jobId. If `job_candidates` is missing or another DB error occurs,
 * logs a warning and returns {} so list/detail routes can still return 200.
 */
export async function getJobCandidateCountsForJobs(
  jobIds: string[]
): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {};
  try {
    const rows = await prisma.jobCandidate.groupBy({
      by: ["jobId"],
      where: { jobId: { in: jobIds } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.jobId, r._count._all]));
  } catch (e) {
    console.warn(
      "[job-candidate-count] groupBy skipped (run migrations or baseline DB):",
      e instanceof Error ? e.message : e
    );
    return {};
  }
}

export async function getJobCandidateCountForJob(jobId: string): Promise<number> {
  try {
    return await prisma.jobCandidate.count({ where: { jobId } });
  } catch (e) {
    console.warn(
      "[job-candidate-count] count skipped (run migrations or baseline DB):",
      e instanceof Error ? e.message : e
    );
    return 0;
  }
}
