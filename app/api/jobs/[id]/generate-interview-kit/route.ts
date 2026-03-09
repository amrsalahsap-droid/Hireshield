import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { interviewKitGeneratorV1 } from "@/lib/prompts/interview_kit_v1";
import { callLLMAndParseJSON } from "@/lib/server/ai/call";
import { InterviewKit_v1 } from "@/lib/schemas/interview-kit";
import { JDExtraction_v1 } from "@/lib/schemas/jd-extraction";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { incrementInterviewKitUsage, getUsageSnapshot } from "@/lib/usage";

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

      // Build prompt from validated JD extraction
      const prompt = interviewKitGeneratorV1.build({
        jobTitle: validatedData.roleTitle || job.title,
        seniorityLevel: validatedData.seniorityLevel || 'UNKNOWN',
        requiredSkills: validatedData.requiredSkills || [],
        preferredSkills: validatedData.preferredSkills || [],
        keyResponsibilities: validatedData.keyResponsibilities || [],
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
        interviewKit: result.value,
        requestId,
        cached: false,
        job: {
          id: updatedJob.id,
          title: updatedJob.title,
          interviewKitGeneratedAt: updatedJob.interviewKitGeneratedAt,
          interviewKitPromptVersion: updatedJob.interviewKitPromptVersion,
        },
        usage: usageResult.success ? usageResult.usage : undefined,
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
