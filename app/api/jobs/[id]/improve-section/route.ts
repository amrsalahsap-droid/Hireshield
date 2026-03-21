import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { aiService } from "@/lib/ai/service";
import { handleAIRouteError } from "@/lib/server/ai-error-mapping";

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
      // Generate targeted improvement based on issue type
      const improvementPrompt = generateTargetedPrompt(issueType, issueDescription, job.title, rawJD);
      
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

      return NextResponse.json({
        suggestion: result.suggestion,
        requestId,
        job: {
          id: job.id,
          title: job.title,
        },
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

      // Return structured error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        {
          success: false,
          error: "Targeted improvement failed",
          message: "Failed to generate targeted improvement. Please try again.",
          details: errorMessage,
          requestId
        },
        { status: 500 }
      );
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
    
    return NextResponse.json(
      {
        success: false,
        error: "Targeted improvement failed",
        message: "Failed to generate targeted improvement. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        requestId
      },
      { status: 500 }
    );
  }
});

// Helper function to generate targeted improvement prompts
function generateTargetedPrompt(issueType: string, issueDescription: string, jobTitle: string, rawJD: string): string {
  const baseContext = `
Job Title: ${jobTitle}
Current Description: ${rawJD.substring(0, 1000)}${rawJD.length > 1000 ? '...' : ''}

Issue Type: ${issueType}
Issue Description: ${issueDescription}

Please provide a specific, actionable improvement suggestion to address this issue.
Focus on practical, concrete changes that can be implemented in the job description.
Keep the suggestion concise but detailed enough to be immediately useful.
`;

  switch (issueType) {
    case 'missing':
      if (issueDescription.toLowerCase().includes('salary')) {
        return baseContext + `
        
Specifically, suggest:
1. A realistic salary range based on market data for this role
2. How to phrase the compensation section professionally
3. Whether to include additional benefits or perks information`;
      }
      if (issueDescription.toLowerCase().includes('skills')) {
        return baseContext + `
        
Specifically, suggest:
1. Key technical skills required for this role
2. How to organize them in a clear, scannable format
3. Whether to separate required vs. preferred skills`;
      }
      if (issueDescription.toLowerCase().includes('experience')) {
        return baseContext + `
        
Specifically, suggest:
1. Clear years of experience requirement
2. What level of seniority this represents
3. How to phrase experience requirements attractively`;
      }
      break;

    case 'ambiguity':
      if (issueDescription.toLowerCase().includes('placeholder')) {
        return baseContext + `
        
Specifically, suggest:
1. Replace placeholder text with specific job details
2. Add concrete examples of responsibilities
3. Include actual requirements and qualifications`;
      }
      if (issueDescription.toLowerCase().includes('vague')) {
        return baseContext + `
        
Specifically, suggest:
1. Add specific metrics or deliverables
2. Include concrete examples of daily tasks
3. Clarify ambiguous statements with precise language`;
      }
      break;

    case 'unrealistic':
      if (issueDescription.toLowerCase().includes('experience')) {
        return baseContext + `
        
Specifically, suggest:
1. More realistic experience requirements for the role level
2. Alternative ways to phrase experience requirements
3. What comparable roles typically require`;
      }
      if (issueDescription.toLowerCase().includes('skills')) {
        return baseContext + `
        
Specifically, suggest:
1. A balanced set of technical skills
2. Prioritizing must-have vs. nice-to-have skills
3. Skills that are commonly found together in this role`;
      }
      break;

    default:
      return baseContext + `
      
Provide a general improvement suggestion that addresses the specific issue mentioned.
Focus on making the job description more complete, clear, and attractive to qualified candidates.`;
  }

  return baseContext + `
  
Provide a specific, actionable improvement suggestion to address this issue.
The suggestion should be practical and immediately implementable in the job description.`;
}
