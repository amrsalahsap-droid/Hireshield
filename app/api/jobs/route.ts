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
    const { title, rawJD, status, skills } = body;

    // Input validation using guards
    try {
      assertNonEmpty("title", title);
      assertMaxLen("title", title, 200);
      
      if (rawJD) {
        assertNonEmpty("rawJD", rawJD);
        assertLengthBounds("rawJD", rawJD, 50, 10000);
      }
      
      if (status && !["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
        throw new Error("Status must be one of: DRAFT, ACTIVE, ARCHIVED");
      }

      // Validate skills if provided
      if (skills && Array.isArray(skills)) {
        if (skills.length > 20) {
          throw new Error("Maximum 20 skills allowed");
        }
        for (const skill of skills) {
          if (!skill.name || typeof skill.name !== "string") {
            throw new Error("Each skill must have a name");
          }
          if (!["beginner", "intermediate", "advanced", "expert"].includes(skill.experienceLevel)) {
            throw new Error("Invalid experience level");
          }
          if (!["required", "optional"].includes(skill.requirementType)) {
            throw new Error("Invalid requirement type");
          }
        }
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

    // Create job with skills in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the job first
      const job = await tx.job.create({
        data: {
          title: title.trim(),
          rawJD: rawJD || "",
          status: status || "DRAFT",
          orgId,
        },
      });

      // Create skills if provided
      if (skills && Array.isArray(skills) && skills.length > 0) {
        for (const skillData of skills) {
          // Find or create the skill
          const skill = await tx.skill.upsert({
            where: { name: skillData.name.trim() },
            update: {},
            create: { name: skillData.name.trim() },
          });

          // Create the job skill relationship
          await tx.jobSkill.create({
            data: {
              jobId: job.id,
              skillId: skill.id,
              experienceLevel: skillData.experienceLevel.toUpperCase(),
              requirementType: skillData.requirementType.toUpperCase(),
            },
          });
        }
      }

      return job;
    });

    return NextResponse.json({ job: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
});
