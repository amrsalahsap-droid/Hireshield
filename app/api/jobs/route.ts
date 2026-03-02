import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { assertMaxLen, assertNonEmpty, isGuardViolation, formatGuardError } from "@/lib/guards";

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
    const { title, rawJD, status } = body;

    // Input validation using guards
    try {
      assertNonEmpty("title", title);
      assertMaxLen("title", title, 200);
      
      if (rawJD) {
        assertMaxLen("rawJD", rawJD, 10000);
      }
      
      if (status && !["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
        throw new Error("Status must be one of: DRAFT, ACTIVE, ARCHIVED");
      }
    } catch (error) {
      if (isGuardViolation(error)) {
        return NextResponse.json(
          formatGuardError(error),
          { status: error.code }
        );
      }
      throw error; // Re-throw non-guard errors
    }

    const job = await prisma.job.create({
      data: {
        title: title.trim(),
        rawJD: rawJD || "",
        status: status || "DRAFT",
        orgId,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
});
