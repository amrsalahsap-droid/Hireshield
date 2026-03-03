import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { jdAnalyzerV1 } from "@/lib/prompts/jd_analyzer_v1";
import { interviewKitGeneratorV1 } from "@/lib/prompts/interview_kit_v1";
import { callLLMAndParseJSON } from "@/lib/server/ai/call";
import { JDExtraction_v1 } from "@/lib/schemas/jd-extraction";
import { InterviewKit_v1 } from "@/lib/schemas/interview-kit";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";

// GET /api/jobs/[id] - Get job details or JD analysis status
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if this is a JD analysis status request
    if (searchParams.get('status') === 'jd-analysis') {
      // JD analysis status endpoint
      const job = await prisma.job.findFirst({
        where: { id, orgId },
        select: {
          jdAnalysisStatus: true,
          jdAnalyzedAt: true,
          jdPromptVersion: true,
          jdExtractionJson: true,
          jdLastError: true,
        }
      });

      if (!job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: job.jdAnalysisStatus || 'NOT_STARTED',
        analyzedAt: job.jdAnalyzedAt,
        promptVersion: job.jdPromptVersion,
        hasExtraction: !!job.jdExtractionJson,
        lastError: job.jdLastError,
      });
    }

    // Regular job details endpoint
    const job = await prisma.job.findFirst({
      where: { 
        id,
        orgId, // Ensures cross-org protection
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
});

// PATCH /api/jobs/[id] - Update job
export const PATCH = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, rawJD, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the organization
    const existingJob = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Validation for updates
    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 }
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "Title must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (rawJD !== undefined) {
      if (typeof rawJD !== "string") {
        return NextResponse.json(
          { error: "rawJD must be a string" },
          { status: 400 }
        );
      }
      if (rawJD.trim().length === 0) {
        return NextResponse.json(
          { error: "Job description cannot be empty" },
          { status: 400 }
        );
      }
      if (rawJD.length > 10000) {
        return NextResponse.json(
          { error: "Job description must be less than 10,000 characters" },
          { status: 400 }
        );
      }
      updateData.rawJD = rawJD;
    }

    if (status !== undefined) {
      if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be one of: DRAFT, ACTIVE, ARCHIVED" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Ensure there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
});

// DELETE /api/jobs/[id] - Archive job (soft delete)
export const DELETE = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the organization
    const existingJob = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Soft delete by archiving
    const archivedJob = await prisma.job.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ 
      message: "Job archived successfully",
      job: archivedJob 
    });
  } catch (error) {
    console.error("Error archiving job:", error);
    return NextResponse.json(
      { error: "Failed to archive job" },
      { status: 500 }
    );
  }
});

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

// PUT /api/jobs/[id]/generate-interview-kit - Generate interview kit from JD extraction
export const PUT = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === '1';

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

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

    // Validate precondition: jdExtractionJson exists
    if (!job.jdExtractionJson) {
      return NextResponse.json(
        { error: "Analyze JD first", message: "Job description must be analyzed before generating interview kit" },
        { status: 409 }
      );
    }

    // Check for cached results (unless force flag is set)
    if (!force && job.interviewKitJson && job.interviewKitGeneratedAt) {
      return NextResponse.json({
        interviewKit: job.interviewKitJson,
        requestId: null,
        cached: true,
        job: {
          id: job.id,
          title: job.title,
          interviewKitGeneratedAt: job.interviewKitGeneratedAt,
          interviewKitPromptVersion: job.interviewKitPromptVersion,
        },
      });
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
    } catch (error) {
      // Continue without audit logging if auth fails
      console.warn("Failed to get current user for audit logging:", error);
    }

    // Update status to RUNNING
    await prisma.job.update({
      where: { id },
      data: {
        interviewKitStatus: 'RUNNING',
        interviewKitLastError: null,
      },
    });

    try {
      // Extract data from JD analysis
      const jdExtraction = job.jdExtractionJson as any;

      // Build prompt from JD extraction
      const prompt = interviewKitGeneratorV1.build({
        jobTitle: jdExtraction.roleTitle || job.title,
        seniorityLevel: jdExtraction.seniorityLevel || 'UNKNOWN',
        requiredSkills: jdExtraction.requiredSkills || [],
        preferredSkills: jdExtraction.preferredSkills || [],
        keyResponsibilities: jdExtraction.keyResponsibilities || [],
        rawJD: job.rawJD,
      });

      // Call LLM with InterviewKit_v1 schema parsing
      const result = await callLLMAndParseJSON({
        promptId: interviewKitGeneratorV1.id,
        system: prompt.system,
        user: prompt.user,
        schema: InterviewKit_v1,
        requestId,
        orgId,
      });

      // Save interview kit to database
      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          interviewKitJson: result.value,
          interviewKitGeneratedAt: new Date(),
          interviewKitPromptVersion: interviewKitGeneratorV1.version,
          interviewKitStatus: 'DONE',
          interviewKitLastError: null,
        },
      });

      // Log successful generation
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_GENERATED,
          entityType: 'JOB',
          entityId: id,
          metadata: { 
            requestId,
            force,
          },
        });
      }

      return NextResponse.json({
        interviewKit: result.value,
        requestId,
        cached: false,
        job: {
          id: updatedJob.id,
          title: updatedJob.title,
          interviewKitGeneratedAt: updatedJob.interviewKitGeneratedAt,
          interviewKitPromptVersion: updatedJob.interviewKitPromptVersion,
        },
        meta: result.meta,
      });

    } catch (error) {
      console.error("Error generating interview kit:", error);
      
      // Update job status to FAILED with error details
      try {
        await prisma.job.update({
          where: { id },
          data: {
            interviewKitStatus: 'FAILED',
            interviewKitLastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        console.error("Failed to update job error status:", updateError);
      }

      // Log generation failure
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_GENERATE_FAILED,
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
            error: "Interview kit generation failed",
            details: llmError.message,
            code: llmError.code,
            requestId,
          },
          { status: statusCode }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to generate interview kit",
          requestId,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in PUT /api/jobs/[id]/generate-interview-kit:", error);
    return NextResponse.json(
      { error: "Failed to generate interview kit" },
      { status: 500 }
    );
  }
});
