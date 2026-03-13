import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { getCandidateStage } from "@/lib/server/candidate-stages";

// GET /api/jobs/[id]/candidates/[candidateId]/stage - Get candidate stage for a specific job
export const GET = withOrgContext(async (
  request: NextRequest, 
  orgId: string, 
  { params }: { params: { id: string; candidateId: string } }
) => {
  try {
    const { id: jobId, candidateId } = params;

    // Get the candidate's stage for this specific job
    const stage = await getCandidateStage(jobId, candidateId);

    return NextResponse.json({ stage });
  } catch (error) {
    console.error("Error getting candidate stage:", error);
    return NextResponse.json(
      { error: "Failed to get candidate stage" },
      { status: 500 }
    );
  }
});
