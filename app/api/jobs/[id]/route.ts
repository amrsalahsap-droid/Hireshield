import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id] - Get job details
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

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
      if (rawJD.length > 50000) {
        return NextResponse.json(
          { error: "Job description must be less than 50,000 characters" },
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

    // Soft delete by archiving
    const archivedJob = await prisma.job.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ 
      message: "Job archived successfully",
      job: archivedJob 
    });
  } catch (error) {
    console.error("Error archiving job:", error);
    return NextResponse.json(
      { error: "Failed to archive job" },
      { status: 500 }
    );
  }
});
