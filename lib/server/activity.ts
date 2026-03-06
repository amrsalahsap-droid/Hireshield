import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit";

export type ActivityFeedItem = {
  id: string;
  action: string;
  label: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  href: string;
  createdAt: string;
};

export type ActivityFeedPage = {
  items: ActivityFeedItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const ACTIVITY_ACTIONS = [
  AUDIT_ACTIONS.JOB_JD_ANALYZE_COMPLETED,
  AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED,
  AUDIT_ACTIONS.CANDIDATE_EVALUATED,
  AUDIT_ACTIONS.CANDIDATE_ADDED,
] as string[];

const ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.JOB_JD_ANALYZE_COMPLETED]: "JD analyzed",
  [AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED]: "Interview kit generated",
  [AUDIT_ACTIONS.CANDIDATE_EVALUATED]: "Candidate evaluated",
  [AUDIT_ACTIONS.CANDIDATE_ADDED]: "Candidate added",
};

export const ALLOWED_PAGE_SIZES = [5, 10, 20] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export function clampPageSize(raw: number): AllowedPageSize {
  if (raw === 10) return 10;
  if (raw === 20) return 20;
  return 5;
}

export async function getRecentActivity(
  orgId: string,
  page: number,
  pageSize: AllowedPageSize
): Promise<ActivityFeedPage> {
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId, action: { in: ACTIVITY_ACTIONS } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({
      where: { orgId, action: { in: ACTIVITY_ACTIONS } },
    }),
  ]);

  if (logs.length === 0) {
    return { items: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  const jobIds = logs.filter((l) => l.entityType === "JOB").map((l) => l.entityId);
  const evalIds = logs.filter((l) => l.entityType === "EVALUATION").map((l) => l.entityId);
  const candidateIds = logs.filter((l) => l.entityType === "CANDIDATE").map((l) => l.entityId);

  const [jobs, evaluations, candidates] = await Promise.all([
    jobIds.length
      ? prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
    evalIds.length
      ? prisma.evaluation.findMany({
          where: { id: { in: evalIds } },
          select: {
            id: true,
            jobId: true,
            job: { select: { title: true } },
            candidate: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    candidateIds.length
      ? prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);

  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));
  const evalMap = new Map(
    evaluations.map((e) => [
      e.id,
      { jobId: e.jobId, label: `${e.candidate.fullName} for ${e.job.title}`, href: `/app/evaluations/${e.id}` },
    ])
  );
  const candidateMap = new Map(candidates.map((c) => [c.id, c.fullName]));

  const items: ActivityFeedItem[] = logs.map((log) => {
    const label = ACTION_LABELS[log.action] ?? log.action;
    let entityLabel = log.entityId;
    let href = "#";

    if (log.entityType === "JOB") {
      entityLabel = jobMap.get(log.entityId) ?? log.entityId;
      href = `/app/jobs/${log.entityId}`;
    } else if (log.entityType === "EVALUATION") {
      const evalEntry = evalMap.get(log.entityId);
      entityLabel = evalEntry?.label ?? log.entityId;
      href = evalEntry?.href ?? `/app/evaluations/${log.entityId}`;
    } else if (log.entityType === "CANDIDATE") {
      entityLabel = candidateMap.get(log.entityId) ?? log.entityId;
      href = `/app/candidates/${log.entityId}`;
    }

    return {
      id: log.id,
      action: log.action,
      label,
      entityType: log.entityType,
      entityId: log.entityId,
      entityLabel,
      href,
      createdAt: log.createdAt.toISOString(),
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
