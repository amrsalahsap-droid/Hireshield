import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/candidates - List candidates for the organization
export const GET = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    // Parse query parameters for filtering and pagination
    const searchParams = new URL(request.url).searchParams;
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: { [key: string]: unknown } = { orgId };
    
    // Add name filtering (case-insensitive partial match)
    if (name) {
      where.fullName = {
        contains: name,
        mode: "insensitive",
      };
    }

    // Add email filtering (case-insensitive partial match)
    if (email) {
      where.email = {
        contains: email,
        mode: "insensitive",
      };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100), // Max 100 items
        skip: offset,
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return NextResponse.json({ 
      candidates,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
});

// POST /api/candidates - Create a new candidate
export const POST = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const body = await request.json();
    const { fullName, email, rawCVText } = body;

    // Validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: "Full name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (fullName.length > 200) {
      return NextResponse.json(
        { error: "Full name must be less than 200 characters" },
        { status: 400 }
      );
    }

    if (email && typeof email !== "string") {
      return NextResponse.json(
        { error: "Email must be a string" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Email must be a valid email address" },
        { status: 400 }
      );
    }

    if (rawCVText && typeof rawCVText !== "string") {
      return NextResponse.json(
        { error: "rawCVText must be a string" },
        { status: 400 }
      );
    }

    if (rawCVText && rawCVText.length > 20000) {
      return NextResponse.json(
        { error: "CV text must be less than 20,000 characters" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: {
        fullName: fullName.trim(),
        email: email || null,
        rawCVText: rawCVText || "",
        orgId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return NextResponse.json(
      { error: "Failed to create candidate" },
      { status: 500 }
    );
  }
});
