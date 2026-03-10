import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { assertMaxLen, assertNonEmpty, assertLengthBounds, isGuardViolation, formatGuardError } from "@/lib/guards";

// POST /api/jobs/[id]/duplicate - Duplicate a job
export const POST = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const jobId = params.id;

    // Validate job ID
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Invalid job ID" },
        { status: 400 }
      );
    }

    // Find the original job
    const originalJob = await prisma.job.findFirst({
      where: {
        id: jobId,
        orgId
      },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!originalJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Create a duplicate job with modified title
    const duplicateJob = await prisma.job.create({
      data: {
        title: `${originalJob.title} (Copy)`,
        rawJD: originalJob.rawJD,
        status: "DRAFT", // Always create duplicate as draft
        orgId,
        // Copy other fields if they exist
        ...(originalJob.department && { department: originalJob.department }),
        ...(originalJob.location && { location: originalJob.location }),
        ...(originalJob.employmentType && { employmentType: originalJob.employmentType }),
        ...(originalJob.seniorityLevel && { seniorityLevel: originalJob.seniorityLevel }),
        ...(originalJob.hiringManager && { hiringManager: originalJob.hiringManager }),
        ...(originalJob.numberOfOpenings && { numberOfOpenings: originalJob.numberOfOpenings }),
        // Copy skills if they exist
        ...(originalJob.skills && originalJob.skills.length > 0 && {
          skills: {
            create: originalJob.skills.map(jobSkill => ({
              skill: {
                connect: { id: jobSkill.skill.id }
              }
            }))
          }
        })
      },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    return NextResponse.json(duplicateJob);

  } catch (error) {
    console.error("Error duplicating job:", error);
    
    if (isGuardViolation(error)) {
      return NextResponse.json(
        { error: formatGuardError(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to duplicate job" },
      { status: 500 }
    );
  }
});
