import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { assertMaxLen, assertNonEmpty, assertLengthBounds, isGuardViolation, formatGuardError } from "@/lib/guards";

// GET /api/jobs - List jobs for the organization
export const GET = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { orgId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100), // Max 100 items
        skip: offset,
        include: {
          skills: {
            include: {
              skill: true
            }
          }
        }
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({ 
      jobs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
});

// POST /api/jobs - Create a new job
export const POST = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const body = await request.json();
    console.log("Received job creation request:", JSON.stringify(body, null, 2));
    
    // Simplified validation - just check required fields
    const { title, rawJD, status } = body;
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    
    if (!rawJD || !rawJD.trim()) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }
    
    if (rawJD.trim().length < 50) {
      return NextResponse.json(
        { error: "Job description must be at least 50 characters" },
        { status: 400 }
      );
    }

    // Create job with skills in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the job first
      const job = await tx.job.create({
        data: {
          title: title.trim(),
          rawJD: rawJD || "",
          status: status || "DRAFT",
          orgId,
          department: body.department?.trim() || null,
          location: body.location?.trim() || null,
          employmentType: body.employmentType || null,
          seniorityLevel: body.seniorityLevel || null,
          hiringManager: body.hiringManager?.trim() || null,
          numberOfOpenings: body.numberOfOpenings || null,
        },
      });

      // Skip skills creation for now to isolate the issue
      return job;
    });

    return NextResponse.json({ job: result }, { status: 201 });
  } catch (error) {
    console.error("Job creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
});
