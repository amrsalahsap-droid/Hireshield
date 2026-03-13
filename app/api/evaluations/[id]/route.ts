import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { FinalScore_v1 } from "@/lib/schemas/final-score";
import { candidateSignalsExtractorV1 } from "@/lib/prompts/candidate_signals_v1";
import { aiService } from "@/lib/ai/service"; // 🏗️ AI Architecture: Use ONLY aiService - NO direct provider calls
import { randomUUID } from "crypto";
import { handleAIRouteError } from "@/lib/server/ai-error-mapping";
import { createRouteLogContext, logRouteAIStart, logRouteAISuccess, logRouteAIError, logRoutePersistenceIssue } from "@/lib/server/route-ai-logging";

// GET /api/evaluations/[id] - Get evaluation details
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Evaluation ID is required" },
        { status: 400 }
      );
    }

    const evaluation = await prisma.evaluation.findFirst({
      where: { 
        id,
        orgId, // Ensures cross-org protection
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
});

// PUT /api/evaluations/[id] - Update evaluation with candidate signals
export const PUT = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Evaluation ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const hasFinalScoreInBody = Object.prototype.hasOwnProperty.call(body, "finalScoreJson");
    const { 
      signalsJson, 
      signalsPromptVersion, 
      rawModelOutputSnippet,
      finalScoreJson,
    } = body;

    // Validate that evaluation exists and belongs to the organization
    const existingEvaluation = await prisma.evaluation.findFirst({
      where: { 
        id,
        orgId,
      },
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { error: "Evaluation not found or does not belong to your organization" },
        { status: 404 }
      );
    }

    // Validate signals JSON if provided
    if (signalsJson) {
      try {
        const validatedSignals = CandidateSignals_v1.parse(signalsJson);
        body.signalsJson = validatedSignals;
      } catch (validationError) {
        console.error("Signals validation error:", validationError);
        return NextResponse.json(
          { error: "Invalid signals data format", details: validationError },
          { status: 400 }
        );
      }
    }

    if (hasFinalScoreInBody && finalScoreJson !== null) {
      try {
        body.finalScoreJson = FinalScore_v1.parse(finalScoreJson);
      } catch (validationError) {
        console.error("Final score validation error:", validationError);
        return NextResponse.json(
          { error: "Invalid final score data format", details: validationError },
          { status: 400 }
        );
      }
    }

    // Truncate raw model output snippet if provided (max 4k chars)
    let truncatedSnippet = rawModelOutputSnippet;
    if (rawModelOutputSnippet && rawModelOutputSnippet.length > 4000) {
      truncatedSnippet = rawModelOutputSnippet.substring(0, 4000);
    }

    const updateData: Record<string, unknown> = {
      signalsJson: signalsJson || undefined,
      signalsPromptVersion: signalsPromptVersion || undefined,
      signalsGeneratedAt: signalsJson ? new Date() : undefined,
      rawModelOutputSnippet: truncatedSnippet || undefined,
    };
    if (hasFinalScoreInBody) {
      if (finalScoreJson === null) {
        updateData.finalScoreJson = null;
        updateData.status = "PENDING";
        updateData.completedAt = null;
        updateData.riskLevel = null;
      } else {
        updateData.finalScoreJson = body.finalScoreJson;
        updateData.status = "COMPLETED";
        updateData.completedAt = new Date();
        const rawRisk = (body.finalScoreJson as { riskLevel?: unknown })?.riskLevel;
        if (typeof rawRisk === "string") {
          const r = rawRisk.toUpperCase();
          updateData.riskLevel =
            r === "RED" ? "HIGH" : r === "YELLOW" ? "MEDIUM" : r === "GREEN" ? "LOW" : null;
        }
      }
    }

    // Update evaluation with signals data
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (hasFinalScoreInBody && finalScoreJson !== null) {
      const authUser = await getAuthUserFromRequest(request).catch(() => null);
      if (authUser?.id) {
        createAuditLog({
          orgId,
          actorUserId: authUser.id,
          action: AUDIT_ACTIONS.CANDIDATE_EVALUATED,
          entityType: 'EVALUATION',
          entityId: id,
        });
      }
    }

    return NextResponse.json({ evaluation: updatedEvaluation });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to update evaluation" },
      { status: 500 }
    );
  }
});

// POST /api/evaluations/[id]/generate-signals - Generate candidate signals
export const POST = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Evaluation ID is required" },
        { status: 400 }
      );
    }

    // Load evaluation with Job + Candidate
    const evaluation = await prisma.evaluation.findFirst({
      where: { id, orgId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jdExtractionJson: true,
            rawJD: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            rawCVText: true,
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    // Get latest interview for this candidate and job
    const latestInterview = await prisma.interview.findFirst({
      where: {
        jobId: evaluation.jobId,
        candidateId: evaluation.candidateId,
        orgId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transcriptText: true,
        createdAt: true,
      },
    });

    // Input validation - check CV and transcript lengths
    if (!evaluation.candidate.rawCVText || evaluation.candidate.rawCVText.trim().length === 0) {
      return NextResponse.json(
        { error: "Candidate CV is missing or empty" },
        { status: 400 }
      );
    }

    if (evaluation.candidate.rawCVText.length > 100000) {
      return NextResponse.json(
        { error: "Candidate CV is too large (max 100,000 characters)" },
        { status: 400 }
      );
    }

    const transcriptText = latestInterview?.transcriptText || '';
    if (transcriptText.length > 200000) {
      return NextResponse.json(
        { error: "Interview transcript is too large (max 200,000 characters)" },
        { status: 400 }
      );
    }

    // Recommended: Ensure job JD analyzed (warning if not)
    let jdWarning = '';
    if (!evaluation.job.jdExtractionJson) {
      jdWarning = 'Job description has not been analyzed. Role context may be limited.';
    }

    // Generate request ID for tracking
    const requestId = randomUUID();

    // Create route logging context
    const logContext = createRouteLogContext(
      'POST /api/evaluations/[id]/generate-signals',
      'generateCandidateSignals',
      requestId,
      orgId
    );

    // Extract job context from JD analysis (if available)
    let jobContext = '';
    let requiredSkills: string[] = [];
    let keyResponsibilities: string[] = [];
    
    if (evaluation.job.jdExtractionJson) {
      const jdExtraction = evaluation.job.jdExtractionJson as any;
      requiredSkills = jdExtraction.requiredSkills || [];
      keyResponsibilities = jdExtraction.keyResponsibilities || [];
      jobContext = `Role: ${jdExtraction.roleTitle || evaluation.job.title}, Seniority: ${jdExtraction.seniorityLevel || 'UNKNOWN'}`;
    } else {
      jobContext = `Role: ${evaluation.job.title} (JD not analyzed)`;
    }

    // Call AI service with centralized error handling and logging
    logRouteAIStart(logContext, {
      candidateProfile: {
        fullName: evaluation.candidate.fullName,
        rawCVText: evaluation.candidate.rawCVText,
      },
      jobRequirements: {
        title: evaluation.job.title,
        description: evaluation.job.rawJD,
        requiredSkills: requiredSkills,
        experienceLevel: (evaluation.job.jdExtractionJson as any)?.experienceLevel || 'UNKNOWN',
        seniorityLevel: (evaluation.job.jdExtractionJson as any)?.seniorityLevel || 'UNKNOWN',
      },
    });

    const result = await aiService.generateCandidateSignals({
      candidateProfile: {
        fullName: evaluation.candidate.fullName,
        rawCVText: evaluation.candidate.rawCVText,
      },
      jobRequirements: {
        title: evaluation.job.title,
        description: evaluation.job.rawJD,
        requiredSkills: requiredSkills,
        experienceLevel: (evaluation.job.jdExtractionJson as any)?.experienceLevel || 'UNKNOWN',
        seniorityLevel: (evaluation.job.jdExtractionJson as any)?.seniorityLevel || 'UNKNOWN',
      },
      skills: [], // Skills will be extracted from CV by the AI service
      education: [], // Education will be extracted from CV by the AI service
      requestId,
      orgId
    });

    // Store in Evaluation signals fields
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        signalsJson: result as any, // Type assertion for Prisma JSON field
        signalsPromptVersion: candidateSignalsExtractorV1.version,
        signalsGeneratedAt: new Date(),
        rawModelOutputSnippet: transcriptText ? 
          transcriptText.substring(0, 4000) : 
          'No transcript available',
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Log AI operation success
    logRouteAISuccess(logContext, result, true);

    return NextResponse.json({
      signals: result,
      requestId,
      evaluation: {
        id: updatedEvaluation.id,
        signalsGeneratedAt: updatedEvaluation.signalsGeneratedAt,
        signalsPromptVersion: updatedEvaluation.signalsPromptVersion,
      },
      meta: undefined, // AI service doesn't provide meta for generateCandidateSignals
      warnings: jdWarning ? [jdWarning] : undefined,
    });

  } catch (error) {
    console.error("Error generating candidate signals:", error);
    
    // Log AI operation error
    logRouteAIError(logContext, error, false);
    
    // Use standardized AI error mapping
    return handleAIRouteError(error, 'candidate-signals', requestId);
  }
});
