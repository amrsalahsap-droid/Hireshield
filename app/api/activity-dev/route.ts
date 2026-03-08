import { NextRequest, NextResponse } from "next/server";
import type { ActivityFeedItem } from "@/lib/server/activity";

// Development-only activity endpoint with mock data
export async function GET(request: NextRequest) {
  // Only allow this in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Mock activity data matching ActivityFeedItem interface
    const mockActivities: ActivityFeedItem[] = [
      {
        id: "1",
        action: "CANDIDATE_EVALUATED",
        label: "Candidate evaluated",
        entityType: "EVALUATION",
        entityId: "eval-123",
        entityLabel: "Sarah Johnson for Senior Frontend Developer",
        href: "/app/evaluations/eval-123",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "2", 
        action: "CANDIDATE_ADDED",
        label: "Candidate added",
        entityType: "CANDIDATE",
        entityId: "cand-456",
        entityLabel: "Michael Chen",
        href: "/app/candidates/cand-456",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "3",
        action: "CANDIDATE_ADDED",
        label: "Candidate added",
        entityType: "CANDIDATE",
        entityId: "cand-789",
        entityLabel: "Emily Rodriguez",
        href: "/app/candidates/cand-789",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        action: "JOB_JD_ANALYZE_COMPLETED",
        label: "JD analyzed",
        entityType: "JOB",
        entityId: "job-abc",
        entityLabel: "DevOps Engineer",
        href: "/app/jobs/job-abc",
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "5",
        action: "CANDIDATE_EVALUATED",
        label: "Candidate evaluated",
        entityType: "EVALUATION",
        entityId: "eval-456",
        entityLabel: "David Kim for UX Designer",
        href: "/app/evaluations/eval-456",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "6",
        action: "JOB_INTERVIEW_KIT_COMPLETED",
        label: "Interview kit generated",
        entityType: "JOB",
        entityId: "job-def",
        entityLabel: "Backend Engineer",
        href: "/app/jobs/job-def",
        createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "7",
        action: "CANDIDATE_EVALUATED",
        label: "Candidate evaluated",
        entityType: "EVALUATION",
        entityId: "eval-789",
        entityLabel: "Jessica Taylor for Product Manager",
        href: "/app/evaluations/eval-789",
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "8",
        action: "CANDIDATE_ADDED",
        label: "Candidate added",
        entityType: "CANDIDATE",
        entityId: "cand-012",
        entityLabel: "Robert Anderson",
        href: "/app/candidates/cand-012",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    // Paginate results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = mockActivities.slice(startIndex, endIndex);

    return NextResponse.json({
      items,
      page,
      totalPages: Math.ceil(mockActivities.length / pageSize),
      totalItems: mockActivities.length
    });
  } catch (error) {
    console.error("GET /api/activity-dev error:", error);
    return NextResponse.json(
      { error: "Failed to load activity data" },
      { status: 500 }
    );
  }
}
