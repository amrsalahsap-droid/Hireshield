import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/interviews - List interviews for the organization
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

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
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
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100), // Max 100 items
        skip: offset,
      }),
      prisma.interview.count({ where }),
    ]);

    return NextResponse.json({ 
      interviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
});

// POST /api/interviews - Create a new interview
export const POST = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const body = await request.json();
    const { jobId, candidateId, transcriptText } = body;

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

    if (transcriptText && typeof transcriptText !== "string") {
      return NextResponse.json(
        { error: "transcriptText must be a string" },
        { status: 400 }
      );
    }

    if (transcriptText && transcriptText.length > 50000) {
      return NextResponse.json(
        { error: "Transcript text must be less than 50,000 characters" },
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

    const interview = await prisma.interview.create({
      data: {
        jobId,
        candidateId,
        transcriptText: transcriptText || "",
        orgId,
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
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
});
