import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { JDAnalysisStatus, InterviewKitStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { normalizeJdSuggestionForRawJd } from "@/lib/server/normalize-jd-suggestion";
import { insertJdSuggestionIntoRawJd } from "@/lib/server/jd-suggestion-insertion";

// POST /api/jobs/[id]/apply-suggestion - Apply approved suggestion to job description
export const POST = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  const requestId = randomUUID();
  let lastSuccessfulStep = "ROUTE_START";
  
  console.log('APPLY_SUGGESTION_ROUTE_START', { requestId, jobId: params.id, orgId });

  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Job ID is required", message: "Job ID is required", requestId },
        { status: 400 }
      );
    }

    lastSuccessfulStep = "INPUT_VALIDATE_DONE";
    console.log('INPUT_VALIDATE_DONE', { requestId, jobId: id, orgId });

    // Parse request body
    const body = await request.json();
    const { suggestionText, issueType, issueTitle, targetSection, issueDescription } = body;

    if (!suggestionText || !issueType || !issueTitle) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Missing required fields: suggestionText, issueType, issueTitle are required",
          requestId,
          details: {
            suggestionText: !!suggestionText,
            issueType: !!issueType,
            issueTitle: !!issueTitle,
            targetSection: !!targetSection,
          },
        },
        { status: 400 }
      );
    }

    const ctx = {
      issueType: String(issueType),
      issueTitle: String(issueTitle),
      targetSection: targetSection != null ? String(targetSection) : undefined,
      issueDescription: issueDescription != null ? String(issueDescription) : undefined,
    };

    const jdReadyText = normalizeJdSuggestionForRawJd(String(suggestionText), ctx);

    if (!jdReadyText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Empty suggestion after normalization",
          message:
            "The suggestion contained only instructions or meta text. Generate again or edit the text so it includes paste-ready job description wording.",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate that jobId matches route id
    if (body.jobId && body.jobId !== id) {
      return NextResponse.json(
        { success: false, error: "Job ID mismatch", message: "Job ID mismatch", requestId },
        { status: 400 }
      );
    }

    lastSuccessfulStep = "JOB_LOOKUP_DONE";
    console.log('JOB_LOOKUP_DONE', { requestId, jobId: id, orgId });

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

    lastSuccessfulStep = "SUGGESTION_APPLY_START";
    console.log('SUGGESTION_APPLY_START', { requestId, jobId: id, orgId });

    // Log suggestion application request
    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_SUGGESTION_APPLIED,
        entityType: 'JOB',
        entityId: id,
        metadata: {
          requestId,
          issueType,
          issueTitle,
          suggestionTextRaw: suggestionText.substring(0, 200) + (suggestionText.length > 200 ? "..." : ""),
          suggestionTextNormalized:
            jdReadyText.substring(0, 200) + (jdReadyText.length > 200 ? "..." : ""),
        },
      });
    }

    const currentRawJD = job.rawJD || "";
    const updatedRawJD = insertJdSuggestionIntoRawJd(currentRawJD, jdReadyText, ctx);

    lastSuccessfulStep = "DB_UPDATE_START";
    console.log('DB_UPDATE_START', { requestId, jobId: id, orgId });

    // Keep last extraction so issue/suggestion UI stays visible; mark stale so score re-runs and cache is bypassed
    const hadKit =
      job.interviewKitStatus !== InterviewKitStatus.NOT_STARTED || !!job.interviewKitJson;

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        rawJD: updatedRawJD,
        jdAnalysisStatus: JDAnalysisStatus.OUTDATED,
        jdLastError: null,
        ...(hadKit
          ? {
              interviewKitStatus: InterviewKitStatus.OUTDATED,
              interviewKitLastError: null,
            }
          : {
              interviewKitStatus: InterviewKitStatus.NOT_STARTED,
              interviewKitLastError: null,
            }),
        updatedAt: new Date(),
      },
    });

    lastSuccessfulStep = "AUDIT_LOG_DONE";
    console.log('AUDIT_LOG_DONE', { requestId, jobId: id, orgId });

    // Log successful suggestion application
    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_UPDATED,
        entityType: 'JOB',
        entityId: id,
        metadata: {
          requestId,
          issueType,
          originalJdLength: currentRawJD.length,
          updatedJdLength: updatedRawJD.length,
          jdAnalysisStatus: JDAnalysisStatus.OUTDATED,
        },
      });
    }

    lastSuccessfulStep = "RESPONSE_BUILD_DONE";
    console.log('RESPONSE_BUILD_DONE', { requestId, jobId: id, orgId });

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        jobId: id,
        rawJDUpdated: true,
        jdAnalysisStatus: JDAnalysisStatus.OUTDATED,
        interviewKitStatus: updatedJob.interviewKitStatus,
        updatedAt: updatedJob.updatedAt
      }
    });

  } catch (error) {
    console.error("[APPLY_SUGGESTION][FAILED]", {
      requestId,
      jobId: params.id,
      lastSuccessfulStep,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        success: false,
        error: "Targeted suggestion application failed",
        message: "Failed to apply suggestion to job description. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        requestId
      },
      { status: 500 }
    );
  }
});
