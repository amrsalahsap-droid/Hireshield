import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { CandidateSignals_v1 } from "@/lib/schemas/candidate-signals";
import { candidateSignalsExtractorV1 } from "@/lib/prompts/candidate_signals_v1";
import { callLLMAndParseJSON } from "@/lib/server/ai/call";
import { randomUUID } from "crypto";

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
    const { 
      signalsJson, 
      signalsPromptVersion, 
      rawModelOutputSnippet 
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
        // Store the validated data
        body.signalsJson = validatedSignals;
      } catch (validationError) {
        console.error("Signals validation error:", validationError);
        return NextResponse.json(
          { error: "Invalid signals data format", details: validationError },
          { status: 400 }
        );
      }
    }

    // Truncate raw model output snippet if provided (max 4k chars)
    let truncatedSnippet = rawModelOutputSnippet;
    if (rawModelOutputSnippet && rawModelOutputSnippet.length > 4000) {
      truncatedSnippet = rawModelOutputSnippet.substring(0, 4000);
    }

    // Update evaluation with signals data
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        signalsJson: signalsJson || undefined,
        signalsPromptVersion: signalsPromptVersion || undefined,
        signalsGeneratedAt: signalsJson ? new Date() : undefined,
        rawModelOutputSnippet: truncatedSnippet || undefined,
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

    // Load evaluation with Job + Candidate + latest Interview transcript
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
        interviews: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest interview
          select: {
            id: true,
            transcriptText: true,
            createdAt: true,
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

    const transcriptText = evaluation.interviews[0]?.transcriptText || '';
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

    // Build prompt candidate_signals_v1 with role/skills + CV/transcript
    const prompt = candidateSignalsExtractorV1.build({
      roleTitle: evaluation.job.title,
      requiredSkills,
      keyResponsibilities,
      cvText: evaluation.candidate.rawCVText,
      transcriptText: transcriptText || undefined,
      jobContext,
      maxStrengths: 8,
      maxGaps: 8,
      maxRiskFlags: 10,
      maxInconsistencies: 10,
    });

    // Call LLM → validate CandidateSignals_v1
    const result = await callLLMAndParseJSON({
      promptId: candidateSignalsExtractorV1.id,
      system: prompt.system,
      user: prompt.user,
      schema: CandidateSignals_v1,
      requestId,
      orgId,
    });

    // Store in Evaluation signals fields
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        signalsJson: result.value,
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

    return NextResponse.json({
      signals: result.value,
      requestId,
      evaluation: {
        id: updatedEvaluation.id,
        signalsGeneratedAt: updatedEvaluation.signalsGeneratedAt,
        signalsPromptVersion: updatedEvaluation.signalsPromptVersion,
      },
      meta: result.meta,
      warnings: jdWarning ? [jdWarning] : undefined,
    });

  } catch (error) {
    console.error("Error generating candidate signals:", error);
    
    // Handle LLM-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const llmError = error as any;
      return NextResponse.json(
        { 
          error: "Candidate signals generation failed",
          details: llmError.message,
          code: llmError.code,
          requestId: llmError.requestId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate candidate signals" },
      { status: 500 }
    );
  }
});
