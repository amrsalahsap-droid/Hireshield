import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/evaluations - List evaluations for the organization
export const GET = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const candidateId = searchParams.get("candidateId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { orgId };
    
    // Add job filtering
    if (jobId) {
      where.jobId = jobId;
    }

    // Add candidate filtering
    if (candidateId) {
      where.candidateId = candidateId;
    }

    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100), // Max 100 items
        skip: offset,
      }),
      prisma.evaluation.count({ where }),
    ]);

    return NextResponse.json({ 
      evaluations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
});

// POST /api/evaluations - Create a new evaluation
export const POST = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const body = await request.json();
    const { jobId, candidateId } = body;

    // Validation
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Job ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!candidateId || typeof candidateId !== "string") {
      return NextResponse.json(
        { error: "Candidate ID is required and must be a string" },
        { status: 400 }
      );
    }

    // Verify that both job and candidate exist in the same organization
    const [job, candidate] = await Promise.all([
      prisma.job.findFirst({
        where: { id: jobId, orgId },
      }),
      prisma.candidate.findFirst({
        where: { id: candidateId, orgId },
      }),
    ]);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or does not belong to your organization" },
        { status: 404 }
      );
    }

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found or does not belong to your organization" },
        { status: 404 }
      );
    }

    // Check if evaluation already exists for this job-candidate pair
    const existingEvaluation = await prisma.evaluation.findFirst({
      where: {
        jobId,
        candidateId,
        orgId,
      },
    });

    if (existingEvaluation) {
      // Return 409 Conflict - evaluation already exists
      return NextResponse.json(
        { 
          error: "Evaluation already exists for this job and candidate",
          evaluation: existingEvaluation
        },
        { status: 409 }
      );
    }

    // Create new evaluation with empty/null fields for AI to fill later
    const evaluation = await prisma.evaluation.create({
      data: {
        jobId,
        candidateId,
        signalsJson: null as any,
        finalScoreJson: null as any,
        orgId,
      },
      include: {
        job: {
          select: {
            id: true,
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

    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation" },
      { status: 500 }
    );
  }
});
