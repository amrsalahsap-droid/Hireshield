import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { aiService } from "@/lib/ai/service";
import { handleAIRouteError } from "@/lib/server/ai-error-mapping";
import { normalizeJdSuggestionForRawJd } from "@/lib/server/normalize-jd-suggestion";

// POST /api/jobs/[id]/improve-section - Generate targeted JD improvement
export const POST = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  const requestId = randomUUID();
  let lastSuccessfulStep = "ROUTE_START";
  
  console.log('IMPROVE_SECTION_ROUTE_START', { requestId, jobId: params.id, orgId });

  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Job ID is required", message: "Job ID is required", requestId },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { jobId, issueType, issueDescription, rawJD } = body;

    // Validate input
    if (!jobId || !issueType || !issueDescription || !rawJD) {
      return NextResponse.json(
        { 
          success: false,
          error: "Missing required fields", 
          message: "Missing required fields",
          requestId,
          details: {
            jobId: !!jobId,
            issueType: !!issueType,
            issueDescription: !!issueDescription,
            rawJD: !!rawJD
          }
        },
        { status: 400 }
      );
    }

    lastSuccessfulStep = "INPUT_VALIDATE_DONE";
    console.log('INPUT_VALIDATE_DONE', { requestId, jobId, orgId });

    // Validate that jobId matches route id
    if (jobId !== id) {
      return NextResponse.json(
        { success: false, error: "Job ID mismatch", message: "Job ID mismatch", requestId },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to organization
    const job = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found", message: "Job not found", requestId },
        { status: 404 }
      );
    }

    lastSuccessfulStep = "JOB_LOOKUP_DONE";
    console.log('JOB_LOOKUP_DONE', { requestId, jobId, orgId });

    // Get current user for audit logging
    let actorUserId: string | null = null;
    try {
      const currentUser = await getCurrentUserOrThrow();
      // Get database user ID from clerk user ID
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: currentUser.clerkUserId },
        select: { id: true }
      });
      actorUserId = dbUser?.id || null;
    } catch (error) {
      // Continue without audit logging if auth fails
      console.warn("Failed to get current user for audit logging:", error);
    }

    // Log improvement request
    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_IMPROVE_REQUESTED,
        entityType: 'JOB',
        entityId: id,
        metadata: {
          requestId,
          issueType,
          issueDescription,
        },
      });
    }

    try {
      // Gap note for the model (see OpenRouter buildTargetedImprovementPrompt noteBlock)
      const improvementPrompt = buildImprovementContextNote(issueType, issueDescription);
      
      lastSuccessfulStep = "AI_CALL_START";
      console.log('AI_CALL_START', { requestId, jobId, orgId });
      
      // Call AI service with targeted prompt
      const result = await aiService.generateTargetedImprovement({
        jobTitle: job.title,
        rawJD: rawJD,
        issueType: issueType,
        issueDescription: issueDescription,
        improvementPrompt,
        requestId,
        orgId
      });

      lastSuccessfulStep = "AI_CALL_DONE";
      console.log('AI_CALL_DONE', { requestId, jobId, orgId });

      // Log successful improvement generation
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_IMPROVE_COMPLETED,
          entityType: 'JOB',
          entityId: id,
          metadata: {
            requestId,
            issueType,
          },
        });
      }

      lastSuccessfulStep = "RESPONSE_BUILD_DONE";
      console.log('RESPONSE_BUILD_DONE', { requestId, jobId, orgId });

      const rawSuggestion = typeof result.suggestion === "string" ? result.suggestion : "";
      const normalized = normalizeJdSuggestionForRawJd(rawSuggestion, {
        issueType: String(issueType),
        issueTitle: String(issueDescription),
        issueDescription: String(issueDescription),
        targetSection:
          issueType === "missing" && String(issueDescription).toLowerCase().includes("skill")
            ? "Requirements"
            : undefined,
      });

      return NextResponse.json({
        suggestion: normalized.trim() || rawSuggestion.trim(),
        requestId,
        job: {
          id: job.id,
          title: job.title,
        },
        ...(result.fallbackUsed != null && {
          fallbackUsed: result.fallbackUsed,
          fallbackType: result.fallbackType,
          providerUsed: result.providerUsed,
        }),
      });

    } catch (error) {
      console.error("[IMPROVE_SECTION][FAILED]", {
        requestId,
        jobId,
        lastSuccessfulStep,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Log improvement failure
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_IMPROVE_FAILED,
          entityType: 'JOB',
          entityId: id,
          metadata: {
            requestId,
            issueType,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      return handleAIRouteError(error, "targeted-improvement", requestId);
    }
  } catch (error) {
    console.error("[IMPROVE_SECTION][FAILED]", {
      requestId,
      jobId: params.id,
      lastSuccessfulStep,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return handleAIRouteError(error, "targeted-improvement", requestId);
  }
});

/** One-line gap description for the model — avoids "suggest 1/2/3" coaching that leaks into output. */
function buildImprovementContextNote(issueType: string, issueDescription: string): string {
  const t = issueDescription.trim();
  return t ? `${t} (${issueType})` : `Issue class: ${issueType}`;
}
