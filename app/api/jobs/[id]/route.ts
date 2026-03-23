import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { getJobCandidateCountForJob } from "@/lib/server/job-candidate-count";
import { JDAnalysisStatus, InterviewKitStatus } from "@prisma/client";
import { interviewKitGeneratorV1 } from "@/lib/prompts/interview_kit_v1";
import { aiService } from "@/lib/ai/service"; // 🏗️ AI Architecture: Use ONLY aiService - NO direct provider calls
import { JDExtraction_v1 } from "@/lib/schemas/jd-extraction";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { incrementInterviewKitUsage, getUsageSnapshot } from "@/lib/usage";
import { handleAIRouteError } from "@/lib/server/ai-error-mapping";
import { createRouteLogContext } from "@/lib/server/route-ai-logging";
import { runJdAnalysisForJob } from "@/lib/server/run-jd-analysis";
import { dbErrorResponse } from "@/lib/server/db-error";

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

    // Regular job details endpoint (counts loaded separately so missing `job_candidates` table does not 500)
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

    const jobCandidateCount = await getJobCandidateCountForJob(id);

    return NextResponse.json({
      job: {
        ...job,
        _count: { jobCandidates: jobCandidateCount },
      },
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return dbErrorResponse(error, "Failed to fetch job");
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
      // JD text changed — cached extraction is no longer authoritative (same as apply-suggestion).
      const hadKit =
        existingJob.interviewKitStatus !== InterviewKitStatus.NOT_STARTED ||
        !!existingJob.interviewKitJson;
      updateData.jdAnalysisStatus = JDAnalysisStatus.OUTDATED;
      updateData.jdLastError = null;
      if (hadKit) {
        updateData.interviewKitStatus = InterviewKitStatus.OUTDATED;
        updateData.interviewKitLastError = null;
      } else {
        updateData.interviewKitStatus = InterviewKitStatus.NOT_STARTED;
        updateData.interviewKitLastError = null;
      }
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
    return dbErrorResponse(error, "Failed to update job");
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
    return dbErrorResponse(error, "Failed to archive job");
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

    // Create route logging context
    const logContext = createRouteLogContext(
      'POST /api/jobs/[id]/analyze-jd',
      'analyzeJD',
      requestId,
      orgId
    );

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
      // Only serve cached extraction when analysis is still DONE (OUTDATED / edited JD must re-run)
      if (
        !force &&
        job.jdAnalysisStatus === "DONE" &&
        job.jdExtractionJson &&
        job.jdAnalyzedAt
      ) {
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

      const analysisResult = await runJdAnalysisForJob({
        jobId: id,
        orgId,
        requestId,
        jobTitle: job.title,
        rawJD: job.rawJD,
        actorUserId,
        logContext,
      });

      if (!analysisResult.ok) {
        return handleAIRouteError(
          analysisResult.error,
          "jd-analysis",
          requestId
        );
      }

      return NextResponse.json({
        jdExtraction: analysisResult.extraction,
        requestId,
        cached: false,
        analyzedAt: analysisResult.analyzedAt,
        promptVersion: analysisResult.promptVersion,
        meta: undefined,
        ...(analysisResult.fallbackUsed != null && {
          fallbackUsed: analysisResult.fallbackUsed,
          fallbackType: analysisResult.fallbackType,
          providerUsed: analysisResult.providerUsed,
        }),
      });

    } catch (error) {
      console.error("Error analyzing job description:", error);
      return handleAIRouteError(error, "jd-analysis", requestId);
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
  const requestId = randomUUID();
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

      // Log cached interview kit access
      if (actorUserId) {
        await createAuditLog({
          orgId,
          actorUserId,
          action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED,
          entityType: 'JOB',
          entityId: id,
          metadata: { 
            requestId: undefined,
            promptVersion: job.interviewKitPromptVersion,
            cached: true,
          },
        });
      }

      // Get usage snapshot for cached response
      const usageSnapshot = await getUsageSnapshot(orgId);

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
        usage: usageSnapshot,
      });
    }

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

    // Log interview kit generation request
    if (actorUserId) {
      await createAuditLog({
        orgId,
        actorUserId,
        action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_REQUESTED,
        entityType: 'JOB',
        entityId: id,
        metadata: { 
          requestId,
          force,
        },
      });
    }

    try {
      // Extract and validate JD analysis data (defensive programming)
      const jdExtraction = job.jdExtractionJson as any;
      
      // Validate JD extraction against schema before using it
      const validationResult = JDExtraction_v1.safeParse(jdExtraction);
      
      if (!validationResult.success) {
        console.error("JD extraction validation failed for job", id, {
          error: validationResult.error,
          jobId: id,
          orgId,
        });
        
        // Update job status to FAILED with corruption error
        await prisma.job.update({
          where: { id },
          data: {
            interviewKitStatus: 'FAILED',
            interviewKitLastError: 'JD analysis is invalid; re-analyze JD.',
          },
        });

        // Log interview kit generation failure
        if (actorUserId) {
          await createAuditLog({
            orgId,
            actorUserId,
            action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_FAILED,
            entityType: 'JOB',
            entityId: id,
            metadata: { 
              requestId,
              error: 'JD analysis is invalid; re-analyze JD.',
              errorCode: 'DATA_CORRUPTION',
            },
          });
        }
        
        return NextResponse.json(
          { 
            error: "JD analysis is invalid; re-analyze JD.",
            code: 'DATA_CORRUPTION',
            details: 'The stored job description analysis is corrupted or invalid. Please re-analyze the job description.',
            requestId,
          },
          { status: 409 }
        );
      }
      
      // Enforce additional limits (defensive checks beyond schema)
      const validatedData = validationResult.data;
      
      if (validatedData.requiredSkills.length > 20) {
        console.error("Required skills exceeds limit", {
          count: validatedData.requiredSkills.length,
          jobId: id,
          orgId,
        });
        
        return NextResponse.json(
          { 
            error: "JD analysis is invalid; re-analyze JD.",
            code: 'DATA_CORRUPTION',
            details: 'Required skills count exceeds allowed limit.',
            requestId,
          },
          { status: 409 }
        );
      }
      
      if (validatedData.keyResponsibilities.length > 15) {
        console.error("Key responsibilities exceeds limit", {
          count: validatedData.keyResponsibilities.length,
          jobId: id,
          orgId,
        });
        
        return NextResponse.json(
          { 
            error: "JD analysis is invalid; re-analyze JD.",
            code: 'DATA_CORRUPTION',
            details: 'Key responsibilities count exceeds allowed limit.',
            requestId,
          },
          { status: 409 }
        );
      }

      // Call AI service with centralized error handling and logging
      const result = await aiService.generateInterviewKit({
        jobTitle: validatedData.roleTitle || job.title,
        rawJD: job.rawJD,
        extractedSkills: validatedData.requiredSkills || [],
        seniorityLevel: validatedData.seniorityLevel,
        experienceLevel: validatedData.experienceLevel,
        requestId,
        orgId
      });

      // Save interview kit to database
      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          interviewKitJson: result as any, // Type assertion for Prisma JSON field
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
          action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED,
          entityType: 'JOB',
          entityId: id,
          metadata: { 
            requestId,
            promptVersion: interviewKitGeneratorV1.version,
            force,
          },
        });
      }

      // Increment usage count for non-cached generation
      const usageResult = await incrementInterviewKitUsage(orgId);
      if (!usageResult.success) {
        console.error('Failed to increment usage:', usageResult.error);
        // Don't fail the request, but log the error
      }

      return NextResponse.json({
        interviewKit: result,
        requestId,
        cached: false,
        job: {
          id: updatedJob.id,
          title: updatedJob.title,
          interviewKitGeneratedAt: updatedJob.interviewKitGeneratedAt,
          interviewKitPromptVersion: updatedJob.interviewKitPromptVersion,
        },
        usage: usageResult.success ? usageResult.usage : undefined,
        meta: undefined, // AI service doesn't provide meta for generateInterviewKit
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
          action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_FAILED,
          entityType: 'JOB',
          entityId: id,
          metadata: { 
            requestId,
            promptVersion: interviewKitGeneratorV1.version,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
      
      // Use standardized AI error mapping
      return handleAIRouteError(error, 'interview-kit', requestId);
    }
  } catch (error) {
    console.error("Error in PUT /api/jobs/[id]/generate-interview-kit:", error);
    return handleAIRouteError(error, 'interview-kit', requestId);
  }
});
