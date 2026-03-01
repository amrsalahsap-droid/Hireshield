import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

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

    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be less than 200 characters" },
        { status: 400 }
      );
    }

    if (rawJD && typeof rawJD !== "string") {
      return NextResponse.json(
        { error: "rawJD must be a string" },
        { status: 400 }
      );
    }

    if (rawJD && rawJD.length > 10000) {
      return NextResponse.json(
        { error: "Job description must be less than 10,000 characters" },
        { status: 400 }
      );
    }

    if (status && !["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be one of: DRAFT, ACTIVE, ARCHIVED" },
        { status: 400 }
      );
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
