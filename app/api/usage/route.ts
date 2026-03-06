import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";

// GET /api/usage - Get organization usage statistics
export const GET = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const [org, evaluationsCompleted] = await Promise.all([
      prisma.org.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          jdAnalysisCount: true,
          interviewKitCount: true,
          createdAt: true,
        },
      }),
      prisma.evaluation.count({
        where: { orgId, status: "COMPLETED" },
      }),
    ]);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        createdAt: org.createdAt,
      },
      usage: {
        jdAnalysisCount: org.jdAnalysisCount,
        interviewKitCount: org.interviewKitCount,
        evaluationsCompleted,
      },
    });
  } catch (error) {
    console.error("Error fetching usage data:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
});
