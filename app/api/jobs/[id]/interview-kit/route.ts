import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id]/interview-kit - Get interview kit status
export const GET = withOrgContext(async (request: NextRequest, orgId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Find the job with interview kit details
    const job = await prisma.job.findFirst({
      where: { id, orgId },
      select: {
        interviewKitStatus: true,
        interviewKitGeneratedAt: true,
        interviewKitPromptVersion: true,
        interviewKitJson: true,
        interviewKitLastError: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Build response
    const response: any = {
      status: job.interviewKitStatus,
    };

    // Add optional fields only if they exist
    if (job.interviewKitGeneratedAt) {
      response.generatedAt = job.interviewKitGeneratedAt;
    }

    if (job.interviewKitPromptVersion) {
      response.promptVersion = job.interviewKitPromptVersion;
    }

    if (job.interviewKitJson) {
      response.kit = job.interviewKitJson;
    }

    if (job.interviewKitLastError) {
      response.lastError = job.interviewKitLastError;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error in GET /api/jobs/[id]/interview-kit:", error);
    return NextResponse.json(
      { error: "Failed to get interview kit status" },
      { status: 500 }
    );
  }
});
