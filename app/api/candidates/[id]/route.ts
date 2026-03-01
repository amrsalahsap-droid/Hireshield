import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/candidates/[id] - Get candidate details
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findFirst({
      where: { 
        id,
        orgId, // Ensures cross-org protection
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ candidate });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
});

// PATCH /api/candidates/[id] - Update candidate
export const PATCH = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { fullName, email, rawCVText } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Check if candidate exists and belongs to the organization
    const existingCandidate = await prisma.candidate.findFirst({
      where: { id, orgId },
    });

    if (!existingCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Validation for updates
    const updateData: any = {};

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.trim().length === 0) {
        return NextResponse.json(
          { error: "Full name must be a non-empty string" },
          { status: 400 }
        );
      }
      if (fullName.length > 200) {
        return NextResponse.json(
          { error: "Full name must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (email === null) {
        // Allow setting email to null
        updateData.email = null;
      } else if (typeof email !== "string") {
        return NextResponse.json(
          { error: "Email must be a string or null" },
          { status: 400 }
        );
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Email must be a valid email address" },
          { status: 400 }
        );
      } else {
        updateData.email = email;
      }
    }

    if (rawCVText !== undefined) {
      if (typeof rawCVText !== "string") {
        return NextResponse.json(
          { error: "rawCVText must be a string" },
          { status: 400 }
        );
      }
      if (rawCVText.length > 20000) {
        return NextResponse.json(
          { error: "CV text must be less than 20,000 characters" },
          { status: 400 }
        );
      }
      updateData.rawCVText = rawCVText;
    }

    // Ensure there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ candidate: updatedCandidate });
  } catch (error) {
    console.error("Error updating candidate:", error);
    return NextResponse.json(
      { error: "Failed to update candidate" },
      { status: 500 }
    );
  }
});

// DELETE /api/candidates/[id] - Soft delete candidate
export const DELETE = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Check if candidate exists and belongs to the organization
    const existingCandidate = await prisma.candidate.findFirst({
      where: { id, orgId },
    });

    if (!existingCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Soft delete by removing the candidate
    // Note: Since we don't have a status field for candidates, we'll actually delete
    // In a real production app, you might want to add a status field for soft delete
    await prisma.candidate.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: "Candidate deleted successfully",
      candidate: existingCandidate 
    });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json(
      { error: "Failed to delete candidate" },
      { status: 500 }
    );
  }
});
