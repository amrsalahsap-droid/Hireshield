import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { jdAnalyzerV1 } from "@/lib/prompts/jd_analyzer_v1";
import { callLLMAndParseJSON } from "@/lib/server/ai/call";
import { JDExtraction_v1 } from "@/lib/schemas/jd-extraction";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";

// POST /api/jobs/[id]/analyze-jd - Analyze job description with AI
export const POST = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Parse query parameters for force flag
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === '1';

    // Check if job exists and belongs to the organization
    const job = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Input validation - check if JD exists and not too large
    if (!job.rawJD || job.rawJD.trim().length === 0) {
      return NextResponse.json(
        { error: "Job description is missing or empty" },
        { status: 400 }
      );
    }

    if (job.rawJD.length > 10000) {
      return NextResponse.json(
        { error: "Job description is too large (max 10,000 characters)" },
        { status: 413 }
      );
    }

    // Generate request ID for tracking
    const requestId = randomUUID();

    // Get current user for audit logging
    let actorUserId: string | null = null;
    try {
      const currentUser = await getCurrentUserOrThrow();
      // Get the database user ID from clerk user ID
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: currentUser.clerkUserId },
        select: { id: true }
      });
      actorUserId = dbUser?.id || null;
    } catch (authError) {
      // Continue without audit logging if auth fails (development mode)
      console.warn('Could not get user for audit logging:', authError);
    }

    // Log JD analysis request
    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_JD_ANALYZE_REQUESTED,
        entityType: 'JOB',
        entityId: id,
        metadata: { requestId },
      });
    }

    try {
      // Check for cached results (unless force flag is set)
      if (!force && job.jdExtractionJson && job.jdAnalyzedAt) {
        return NextResponse.json({
          jdExtraction: job.jdExtractionJson,
          requestId,
          cached: true,
          analyzedAt: job.jdAnalyzedAt,
          promptVersion: job.jdPromptVersion,
          meta: {
            tokens: { input: 0, output: 0, total: 0 },
            cost: { input: 0, output: 0, total: 0 },
            latency: 0,
            model: 'cached',
          },
        });
      }

      // Update job status to RUNNING
      await prisma.job.update({
        where: { id },
        data: {
          jdAnalysisStatus: 'RUNNING',
          jdLastError: null,
        },
      });

      // Build prompt using Phase 3 prompt builder
      const prompt = jdAnalyzerV1.build({
        jobTitle: job.title,
        rawJD: job.rawJD,
      });

      // Call LLM with JDExtraction_v1 schema parsing
      const result = await callLLMAndParseJSON({
        promptId: jdAnalyzerV1.id,
        system: prompt.system,
        user: prompt.user,
        schema: JDExtraction_v1,
        requestId,
        orgId,
      });

      // Increment usage counter (only when AI is actually called, not cached)
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
        // Log usage tracking error but don't fail the main operation
        console.error('Failed to increment usage counter:', usageError);
      }

      // Save extraction results to database
      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          jdExtractionJson: result.value,
          jdAnalyzedAt: new Date(),
          jdPromptVersion: jdAnalyzerV1.version,
          jdAnalysisStatus: 'DONE',
          jdLastError: null,
      },
      });

      // Log successful completion
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_ANALYZE_COMPLETED,
          entityType: 'JOB',
          entityId: id,
          metadata: { requestId },
        });
      }

      return NextResponse.json({
        jdExtraction: result.value,
        requestId,
        cached: false,
        analyzedAt: updatedJob.jdAnalyzedAt,
        promptVersion: updatedJob.jdPromptVersion,
        meta: result.meta,
      });

    } catch (error) {
      console.error("Error analyzing job description:", error);
      
      // Update job status to FAILED with error details
      try {
        await prisma.job.update({
          where: { id },
          data: {
            jdAnalysisStatus: 'FAILED',
            jdLastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        console.error("Failed to update job error status:", updateError);
      }

      // Log analysis failure
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_JD_ANALYZE_FAILED,
          entityType: 'JOB',
          entityId: id,
          metadata: { 
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
      
      // Handle LLM-specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const llmError = error as any;
        const statusCode = llmError.code === 'RATE_LIMIT' ? 429 : 
                          llmError.code === 'TIMEOUT' ? 502 : 500;
        
        return NextResponse.json(
          { 
            error: "AI analysis failed",
            details: llmError.message,
            code: llmError.code,
            requestId,
          },
          { status: statusCode }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to analyze job description",
          requestId,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/jobs/[id]/analyze-jd:", error);
    return NextResponse.json(
      { error: "Failed to analyze job description" },
      { status: 500 }
    );
  }
});
