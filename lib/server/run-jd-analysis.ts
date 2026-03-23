import { prisma } from "@/lib/prisma";
import { jdAnalyzerV1 } from "@/lib/prompts/jd_analyzer_v1";
import { aiService } from "@/lib/ai/service";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import type { RouteAILogContext } from "@/lib/server/route-ai-logging";
import {
  logRouteAIStart,
  logRouteAISuccess,
  logRouteAIError,
  logRoutePersistenceIssue,
} from "@/lib/server/route-ai-logging";

export type RunJdAnalysisResult =
  | {
      ok: true;
      extraction: unknown;
      analyzedAt: Date;
      promptVersion: string | null;
      fallbackUsed?: boolean;
      fallbackType?: 'provider' | 'local' | null;
      providerUsed?: string;
    }
  | { ok: false; error: unknown };

/**
 * Runs a full JD analysis for an existing job row (RUNNING → AI → DONE or FAILED).
 * Caller is responsible for auth, preconditions, and any prior cache invalidation.
 */
export async function runJdAnalysisForJob(params: {
  jobId: string;
  orgId: string;
  requestId: string;
  jobTitle: string;
  rawJD: string;
  actorUserId: string | null;
  logContext: RouteAILogContext;
}): Promise<RunJdAnalysisResult> {
  const { jobId, orgId, requestId, jobTitle, rawJD, actorUserId, logContext } =
    params;

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        jdAnalysisStatus: "RUNNING",
        jdLastError: null,
      },
    });

    logRouteAIStart(logContext, {
      jobTitle,
      rawJD,
    });

    const result = await aiService.analyzeJD({
      jobTitle,
      rawJD,
      requestId,
      orgId,
    });

    try {
      await prisma.org.update({
        where: { id: orgId },
        data: {
          jdAnalysisCount: {
            increment: 1,
          },
        },
      });
    } catch (usageError) {
      console.error("Failed to increment usage counter:", usageError);
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        jdExtractionJson: result as any,
        jdAnalyzedAt: new Date(),
        jdPromptVersion: jdAnalyzerV1.version,
        jdAnalysisStatus: "DONE",
        jdLastError: null,
      },
    });

    logRouteAISuccess(logContext, result, true);

    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_ANALYZE_COMPLETED,
        entityType: "JOB",
        entityId: jobId,
        metadata: {
          requestId,
          ...(result.fallbackUsed != null && {
            fallbackUsed: result.fallbackUsed,
            fallbackType: result.fallbackType,
            providerUsed: result.providerUsed,
          }),
        },
      });
    }

    return {
      ok: true,
      extraction: result,
      analyzedAt: updatedJob.jdAnalyzedAt!,
      promptVersion: updatedJob.jdPromptVersion,
      fallbackUsed: result.fallbackUsed,
      fallbackType: result.fallbackType,
      providerUsed: result.providerUsed,
    };
  } catch (error) {
    console.error("Error analyzing job description:", error);
    logRouteAIError(logContext, error, false);

    try {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          jdAnalysisStatus: "FAILED",
          jdLastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (updateError) {
      console.error("Failed to update job error status:", updateError);
      logRoutePersistenceIssue(logContext, "status", updateError);
    }

    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_ANALYZE_FAILED,
        entityType: "JOB",
        entityId: jobId,
        metadata: {
          requestId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return { ok: false, error };
  }
}
