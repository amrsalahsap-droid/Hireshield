import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ensureProvisioned, NoSessionError } from "@/lib/server/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JDAnalysisStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";
type InterviewKitStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "FAILED";

async function getDashboardJobsSummary(orgId: string) {
  const [activeCount, archivedCount, recentJobs] = await Promise.all([
    prisma.job.count({ where: { orgId, status: "ACTIVE" } }),
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
    return {
      activeCount,
      archivedCount,
      recentJobs: [] as Array<{
        id: string;
        title: string;
        seniority: string;
        candidateCount: number;
        jdAnalysisStatus: JDAnalysisStatus;
        interviewKitStatus: InterviewKitStatus;
        href: string;
      }>,
    };
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

  const recentJobsWithMeta = recentJobs.map((job) => {
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
    archivedCount,
    recentJobs: recentJobsWithMeta,
  };
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "done") return "text-safe";
  if (s === "running") return "text-investigate";
  if (s === "failed") return "text-destructive";
  return "text-muted-foreground";
}

export default async function AppPage() {
  let user;
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect("/auth");
    }
    user = await ensureProvisioned();
  } catch (error) {
    if (error instanceof NoSessionError) {
      redirect("/auth");
    }
    console.error("Failed to provision user:", error);
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center max-w-md mx-auto space-y-4">
          <p className="font-body text-foreground">
            We couldn&apos;t verify your session. This can happen when the app is deployed without Clerk middleware (e.g. on Vercel).
          </p>
          <p className="font-body text-muted-foreground text-sm">
            Try signing out (using your profile in the sidebar) and then sign in again. If you run the app locally with <code className="bg-muted px-1 rounded text-xs">npm run dev</code>, the dashboard may work there.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 font-body"
          >
            Sign in again
          </Link>
        </div>
      </div>
    );
  }

  const { activeCount, archivedCount, recentJobs } = await getDashboardJobsSummary(user.orgId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">Overview</h1>
        <p className="text-muted-foreground font-body">
          High-level view of hiring activity and readiness. Click a job to open its details.
        </p>
      </div>

      {/* Jobs summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💼</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground font-body truncate">Active jobs</dt>
                  <dd className="text-lg font-semibold text-foreground font-display">{activeCount}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 h-2 bg-primary rounded-full" />
          </div>
        </div>
        <div className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground font-body truncate">Archived jobs</dt>
                  <dd className="text-lg font-semibold text-foreground font-display">{archivedCount}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full" />
          </div>
        </div>
      </div>

      {/* Recently active jobs */}
      <div className="bg-card shadow-card rounded-xl border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-foreground font-display mb-4">
            Recently active jobs
          </h3>

          {recentJobs.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">No jobs yet. Create one from Jobs.</p>
          ) : (
            <div className="rounded-button border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Job title</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Seniority</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Candidates</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">JD analysis</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Interview kit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={job.href}
                          className="font-medium text-foreground font-body text-primary hover:text-primary/90"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">{job.seniority}</td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">{job.candidateCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-body ${statusBadge(job.jdAnalysisStatus)}`}>
                          {job.jdAnalysisStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-body ${statusBadge(job.interviewKitStatus)}`}>
                          {job.interviewKitStatus.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
