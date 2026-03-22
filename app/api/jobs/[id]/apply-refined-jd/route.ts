import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { createRouteLogContext } from "@/lib/server/route-ai-logging";
import { runJdAnalysisForJob } from "@/lib/server/run-jd-analysis";

const REFINED_REANALYSIS_FAILED_MESSAGE =
  "Refined JD applied, but re-analysis failed. Please re-run analysis.";

/**
 * POST /api/jobs/[id]/apply-refined-jd
 * Persists refined rawJD, clears JD analysis fields (stale-safe), runs fresh analysis, returns updated job.
 */
export const POST = withOrgContext(
  async (
    request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    const requestId = randomUUID();

    try {
      const { id } = params;

      if (!id) {
        return NextResponse.json(
          { success: false, error: "Job ID is required", requestId },
          { status: 400 }
        );
      }

      let body: { rawJD?: unknown };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body", requestId },
          { status: 400 }
        );
      }

      const rawJD = body.rawJD;
      if (typeof rawJD !== "string") {
        return NextResponse.json(
          { success: false, error: "rawJD must be a string", requestId },
          { status: 400 }
        );
      }

      const trimmed = rawJD.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { success: false, error: "Job description cannot be empty", requestId },
          { status: 400 }
        );
      }
      if (trimmed.length > 10000) {
        return NextResponse.json(
          {
            success: false,
            error: "Job description must be less than 10,000 characters",
            requestId,
          },
          { status: 400 }
        );
      }

      const existing = await prisma.job.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Job not found", requestId },
          { status: 404 }
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
        // Continue without audit actor in dev / auth edge cases
      }

      await prisma.job.update({
        where: { id },
        data: {
          rawJD: trimmed,
          jdAnalysisStatus: "NOT_STARTED",
          jdExtractionJson: Prisma.DbNull,
          jdAnalyzedAt: null,
          jdPromptVersion: null,
          jdLastError: null,
        },
      });

      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_UPDATED,
          entityType: "JOB",
          entityId: id,
          metadata: { requestId, source: "apply_refined_jd" },
        });
      }

      const job = await prisma.job.findFirst({
        where: { id, orgId },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: "Job not found after update", requestId },
          { status: 500 }
        );
      }

      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_ANALYZE_REQUESTED,
          entityType: "JOB",
          entityId: id,
          metadata: { requestId, source: "apply_refined_jd" },
        });
      }

      const logContext = createRouteLogContext(
        "POST /api/jobs/[id]/apply-refined-jd",
        "analyzeJD",
        requestId,
        orgId
      );

      const analysisResult = await runJdAnalysisForJob({
        jobId: id,
        orgId,
        requestId,
        jobTitle: job.title,
        rawJD: job.rawJD,
        actorUserId,
        logContext,
      });

      const fullJob = await prisma.job.findFirst({
        where: { id, orgId },
      });

      if (analysisResult.ok) {
        return NextResponse.json({
          success: true,
          analysisSuccess: true,
          requestId,
          job: fullJob,
        });
      }

      return NextResponse.json({
        success: true,
        analysisSuccess: false,
        requestId,
        message: REFINED_REANALYSIS_FAILED_MESSAGE,
        job: fullJob,
      });
    } catch (error) {
      console.error("[apply-refined-jd]", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to apply refined job description",
          requestId,
        },
        { status: 500 }
      );
    }
  }
);
