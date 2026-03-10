import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { jdAnalyzerV1 } from "@/lib/prompts/jd_analyzer_v1";
import { interviewKitGeneratorV1 } from "@/lib/prompts/interview_kit_v1";
import { callLLMAndParseJSON } from "@/lib/server/ai/call";
import { JDExtraction_v1 } from "@/lib/schemas/jd-extraction";
import { InterviewKit_v1 } from "@/lib/schemas/interview-kit";
import { randomUUID } from "crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { ExperienceLevel, RequirementType } from "@prisma/client";
import { getCurrentUserOrThrow } from "@/lib/server/auth";
import { incrementInterviewKitUsage, getUsageSnapshot } from "@/lib/usage";

// GET /api/jobs/[id] - Get job details or JD analysis status
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if this is a JD analysis status request
    if (searchParams.get('status') === 'jd-analysis') {
      // JD analysis status endpoint
      const job = await prisma.job.findFirst({
        where: { id, orgId },
        select: {
          jdAnalysisStatus: true,
          jdAnalyzedAt: true,
          jdPromptVersion: true,
          jdExtractionJson: true,
          jdLastError: true,
        }
      });

      if (!job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: job.jdAnalysisStatus || 'NOT_STARTED',
        analyzedAt: job.jdAnalyzedAt,
        promptVersion: job.jdPromptVersion,
        hasExtraction: !!job.jdExtractionJson,
        lastError: job.jdLastError,
      });
    }

    // Regular job details endpoint
    const job = await prisma.job.findFirst({
      where: { 
        id,
        orgId, // Ensures cross-org protection
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
});

// PATCH /api/jobs/[id] - Update job
export const PATCH = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, rawJD, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the organization
    const existingJob = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Validation for updates
    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 }
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "Title must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (rawJD !== undefined) {
      if (typeof rawJD !== "string") {
        return NextResponse.json(
          { error: "rawJD must be a string" },
          { status: 400 }
        );
      }
      if (rawJD.trim().length === 0) {
        return NextResponse.json(
          { error: "Job description cannot be empty" },
          { status: 400 }
        );
      }
      if (rawJD.length > 10000) {
        return NextResponse.json(
          { error: "Job description must be less than 10,000 characters" },
          { status: 400 }
        );
      }
      updateData.rawJD = rawJD;
    }

    if (status !== undefined) {
      if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be one of: DRAFT, ACTIVE, ARCHIVED" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Ensure there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
});

// PUT /api/jobs/[id] - Update job (full update)
export const PUT = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      title, 
      rawJD, 
      department, 
      location, 
      employmentType, 
      seniorityLevel, 
      hiringManager, 
      numberOfOpenings, 
      status, 
      skills 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the organization
    console.log("PUT: Looking for job with ID:", id, "and orgId:", orgId);
    
    // First check if job exists at all (without org filter)
    const jobExists = await prisma.job.findUnique({
      where: { id },
    });
    
    console.log("PUT: Job exists (no org filter):", jobExists);
    
    if (!jobExists) {
      console.log("PUT: Job doesn't exist at all - ID:", id);
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    
    // Then check if it belongs to the organization
    const existingJob = await prisma.job.findFirst({
      where: { id, orgId },
    });

    console.log("PUT: Found job with org filter:", existingJob);

    if (!existingJob) {
      console.log("PUT: Job exists but belongs to different org - ID:", id, "orgId:", orgId);
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Validation for updates
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 }
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "Title must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (rawJD !== undefined) {
      if (typeof rawJD !== "string") {
        return NextResponse.json(
          { error: "rawJD must be a string" },
          { status: 400 }
        );
      }
      if (rawJD.trim().length === 0) {
        return NextResponse.json(
          { error: "Job description cannot be empty" },
          { status: 400 }
        );
      }
      if (rawJD.length > 10000) {
        return NextResponse.json(
          { error: "Job description must be less than 10,000 characters" },
          { status: 400 }
        );
      }
      updateData.rawJD = rawJD;
    }

    if (department !== undefined) {
      if (department && typeof department === "string" && department.length > 100) {
        return NextResponse.json(
          { error: "Department must be less than 100 characters" },
          { status: 400 }
        );
      }
      updateData.department = department?.trim() || null;
    }

    if (location !== undefined) {
      if (location && typeof location === "string" && location.length > 200) {
        return NextResponse.json(
          { error: "Location must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.location = location?.trim() || null;
    }

    if (employmentType !== undefined) {
      updateData.employmentType = employmentType || null;
    }

    if (seniorityLevel !== undefined) {
      updateData.seniorityLevel = seniorityLevel || null;
    }

    if (hiringManager !== undefined) {
      if (hiringManager && typeof hiringManager === "string" && hiringManager.length > 100) {
        return NextResponse.json(
          { error: "Hiring manager must be less than 100 characters" },
          { status: 400 }
        );
      }
      updateData.hiringManager = hiringManager?.trim() || null;
    }

    if (numberOfOpenings !== undefined) {
      const openings = parseInt(numberOfOpenings);
      if (isNaN(openings) || openings < 1 || openings > 100) {
        return NextResponse.json(
          { error: "Number of openings must be between 1 and 100" },
          { status: 400 }
        );
      }
      updateData.numberOfOpenings = openings;
    }

    if (status !== undefined) {
      if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be one of: DRAFT, ACTIVE, ARCHIVED" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Ensure there's something to update
    if (Object.keys(updateData).length <= 1) { // Only updatedAt
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    // Handle skills update if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skill associations
      await prisma.jobSkill.deleteMany({
        where: { jobId: id }
      });

      // Add new skill associations
      if (skills.length > 0) {
        const skillData = skills.map((skillName: string) => ({
          jobId: id,
          skill: {
            connect: {
              name: skillName.trim()
            }
          },
          experienceLevel: ExperienceLevel.INTERMEDIATE,
          requirementType: RequirementType.REQUIRED
        }));

        await prisma.job.update({
          where: { id },
          data: {
            skills: {
              create: skillData
            }
          }
        });
      }

      // Fetch the updated job with skills
      const jobWithSkills = await prisma.job.findUnique({
        where: { id },
        include: {
          skills: {
            include: {
              skill: true
            }
          }
        }
      });

      return NextResponse.json(jobWithSkills);
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
});

// DELETE /api/jobs/[id] - Archive job (soft delete)
export const DELETE = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the organization
    const existingJob = await prisma.job.findFirst({
      where: { id, orgId },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of draft jobs
    if (existingJob.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft jobs can be deleted" },
        { status: 400 }
      );
    }

    // Actually delete the draft job (hard delete)
    await prisma.job.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: "Job deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
});
