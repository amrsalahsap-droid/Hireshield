import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/interviews/[id] - Get interview details
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    const interview = await prisma.interview.findFirst({
      where: { 
        id,
        orgId, // Ensures cross-org protection
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
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

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ interview });
  } catch (error) {
    console.error("Error fetching interview:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 }
    );
  }
});

// PATCH /api/interviews/[id] - Update interview
export const PATCH = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { transcriptText } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // Check if interview exists and belongs to the organization
    const existingInterview = await prisma.interview.findFirst({
      where: { id, orgId },
    });

    if (!existingInterview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Validation for updates
    const updateData: any = {};

    if (transcriptText !== undefined) {
      if (typeof transcriptText !== "string") {
        return NextResponse.json(
          { error: "transcriptText must be a string" },
          { status: 400 }
        );
      }
      if (transcriptText.length > 50000) {
        return NextResponse.json(
          { error: "Transcript text must be less than 50,000 characters" },
          { status: 400 }
        );
      }
      updateData.transcriptText = transcriptText;
    }

    // Ensure there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
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

    return NextResponse.json({ interview: updatedInterview });
  } catch (error) {
    console.error("Error updating interview:", error);
    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
});

// DELETE /api/interviews/[id] - Delete interview
export const DELETE = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // Check if interview exists and belongs to the organization
    const existingInterview = await prisma.interview.findFirst({
      where: { id, orgId },
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

    if (!existingInterview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Delete the interview
    await prisma.interview.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: "Interview deleted successfully",
      interview: existingInterview 
    });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    );
  }
});
