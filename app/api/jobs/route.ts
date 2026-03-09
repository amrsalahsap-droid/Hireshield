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
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const hiringManager = searchParams.get("hiringManager");
    const createdAfter = searchParams.get("createdAfter");
    const createdBefore = searchParams.get("createdBefore");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { orgId };
    
    // Add status filter
    if (status) {
      where.status = status.toUpperCase();
    }
    
    // Add search functionality for title, department, and hiring manager
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { department: { contains: searchTerm, mode: 'insensitive' } },
        { hiringManager: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }
    
    // Add department filter (if not already in search OR)
    if (department && department.trim()) {
      const deptTerm = department.trim();
      if (where.OR) {
        // If we already have OR conditions from search, we need to combine them
        where.AND = [
          { OR: where.OR },
          { department: { contains: deptTerm, mode: 'insensitive' } }
        ];
        delete where.OR;
      } else {
        where.department = { contains: deptTerm, mode: 'insensitive' };
      }
    }
    
    // Add hiring manager filter (if not already in search OR)
    if (hiringManager && hiringManager.trim()) {
      const managerTerm = hiringManager.trim();
      if (where.OR || where.AND) {
        // If we already have conditions, we need to combine them
        const existingCondition = where.OR || where.AND;
        where.AND = Array.isArray(existingCondition) ? existingCondition : [existingCondition];
        where.AND.push({ hiringManager: { contains: managerTerm, mode: 'insensitive' } });
        delete where.OR;
      } else {
        where.hiringManager = { contains: managerTerm, mode: 'insensitive' };
      }
    }
    
    // Add creation date filters
    if (createdAfter) {
      const afterDate = new Date(createdAfter);
      if (!isNaN(afterDate.getTime())) {
        where.createdAt = { ...where.createdAt, gte: afterDate };
      }
    }
    
    if (createdBefore) {
      const beforeDate = new Date(createdBefore);
      // Add one day to include the entire "before" date
      beforeDate.setDate(beforeDate.getDate() + 1);
      if (!isNaN(beforeDate.getTime())) {
        where.createdAt = { ...where.createdAt, lt: beforeDate };
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        take: Math.min(limit, 100), // Max 100 items
        skip: offset,
        include: {
          skills: {
            include: {
              skill: true
            }
          },
          interviews: {
            select: {
              candidateId: true,
              createdAt: true
            }
          },
          evaluations: {
            select: {
              candidateId: true,
              status: true,
              completedAt: true,
              riskLevel: true
            }
          }
        }
      }),
      prisma.job.count({ where }),
    ]);

    // Process jobs to add candidate counts and pipeline progress
    const jobsWithPipelineData = jobs.map((job: any) => {
      const uniqueCandidates = new Set((job.interviews || []).map((i: any) => i.candidateId));
      const candidateCount = Array.from(uniqueCandidates).length;
      
      // Count interviews (unique candidates with interviews)
      const interviewCandidates = new Set((job.interviews || []).map((i: any) => i.candidateId));
      const interviewCount = Array.from(interviewCandidates).length;
      
      // Count decision pending (evaluations that are completed but not final decision)
      const decisionPendingCandidates = new Set(
        (job.evaluations || [])
          .filter((e: any) => e.status === 'PENDING' && e.completedAt)
          .map((e: any) => e.candidateId)
      );
      const decisionPendingCount = Array.from(decisionPendingCandidates).length;
      
      // Count high-risk candidates (evaluations with HIGH risk level)
      const highRiskCandidates = new Set(
        (job.evaluations || [])
          .filter((e: any) => e.riskLevel === 'HIGH')
          .map((e: any) => e.candidateId)
      );
      const highRiskCount = Array.from(highRiskCandidates).length;
      
      // Calculate hiring health based on various factors
      let hiringHealth = null;
      
      // Only calculate health if we have some data
      if (candidateCount > 0 || job.createdAt) {
        const daysSinceCreated = Math.floor((new Date().getTime() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const riskRatio = candidateCount > 0 ? highRiskCount / candidateCount : 0;
        const interviewRatio = candidateCount > 0 ? interviewCount / candidateCount : 0;
        
        // Health calculation logic
        if (riskRatio > 0.5) {
          hiringHealth = 'BLOCKED'; // Too many high-risk candidates
        } else if (daysSinceCreated > 30 && interviewRatio < 0.3) {
          hiringHealth = 'SLOW'; // Old job with low interview rate
        } else if (daysSinceCreated > 60 && candidateCount < 3) {
          hiringHealth = 'SLOW'; // Old job with very few candidates
        } else if (interviewRatio > 0.7 && riskRatio < 0.2) {
          hiringHealth = 'HEALTHY'; // Good interview rate, low risk
        } else if (candidateCount >= 5 && interviewRatio >= 0.4 && riskRatio < 0.3) {
          hiringHealth = 'HEALTHY'; // Decent activity and low risk
        } else if (candidateCount > 0) {
          hiringHealth = 'SLOW'; // Some activity but not great
        }
      }
      
      return {
        ...job,
        candidateCount,
        interviewCount,
        decisionPendingCount,
        highRiskCount,
        hiringHealth
      };
    });

    return NextResponse.json({ 
      jobs: jobsWithPipelineData,
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
