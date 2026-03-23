import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { aiService } from "@/lib/ai/service";
import { respondRefineJdFailure } from "@/lib/server/ai-error-mapping";
import type { AnalyzeJDResult } from "@/lib/ai/types";

/**
 * POST /api/jobs/[id]/refine-jd
 * Generates a reviewable full-JD refinement draft; does not persist rawJD or any job fields.
 */
export const POST = withOrgContext(
  async (
    _request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    const requestId = randomUUID();

    try {
      const { id } = params;

      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error: "Job ID is required",
            message: "Job ID is required",
            requestId,
          },
          { status: 400 }
        );
      }

      const job = await prisma.job.findFirst({
        where: { id, orgId },
        select: {
          id: true,
          title: true,
          rawJD: true,
          jdExtractionJson: true,
        },
      });

      if (!job) {
        return NextResponse.json(
          {
            success: false,
            error: "Job not found",
            message: "Job not found",
            requestId,
          },
          { status: 404 }
        );
      }

      if (!job.rawJD || !job.rawJD.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid job description",
            message:
              "Job description is empty. Add a job description before refining.",
            requestId,
          },
          { status: 400 }
        );
      }

      let actorUserId: string | null = null;
      try {
        const currentUser = await getCurrentUserOrThrow();
        const dbUser = await prisma.user.findUnique({
          where: { clerkUserId: currentUser.clerkUserId },
          select: { id: true },
        });
        actorUserId = dbUser?.id ?? null;
      } catch {
        console.warn(
          "refine-jd: could not resolve user for audit logging",
          requestId
        );
      }

      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_REFINE_REQUESTED,
          entityType: "JOB",
          entityId: id,
          metadata: { requestId },
        });
      }

      const extraction = job.jdExtractionJson
        ? (job.jdExtractionJson as unknown as AnalyzeJDResult)
        : undefined;

      try {
        const result = await aiService.refineJobDescription({
          jobTitle: job.title,
          rawJD: job.rawJD,
          extraction,
          requestId,
          orgId,
        });

        if (actorUserId) {
          await createAuditLog({
            orgId,
            actorUserId,
            action: AUDIT_ACTIONS.JOB_JD_REFINE_COMPLETED,
            entityType: "JOB",
            entityId: id,
            metadata: { requestId },
          });
        }

        return NextResponse.json({
          success: true,
          requestId,
          data: {
            refinedJobDescription: result.refinedJobDescription,
            summary: result.summary,
            changesMade: result.changesMade,
          },
          ...(result.fallbackUsed != null && {
            fallbackUsed: result.fallbackUsed,
            fallbackType: result.fallbackType,
            providerUsed: result.providerUsed,
          }),
        });
      } catch (error) {
        if (actorUserId) {
          await createAuditLog({
            orgId,
            actorUserId,
            action: AUDIT_ACTIONS.JOB_JD_REFINE_FAILED,
            entityType: "JOB",
            entityId: id,
            metadata: {
              requestId,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
        return respondRefineJdFailure(error, requestId);
      }
    } catch (error) {
      console.error("[REFINE_JD][ROUTE_ERROR]", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return respondRefineJdFailure(error, requestId);
    }
  }
);
