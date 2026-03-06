import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequestWithReason } from "@/lib/server/auth-request";
import { getRecentActivity, clampPageSize } from "@/lib/server/activity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, reason } = await getAuthUserFromRequestWithReason(request);
    if (!user) {
      if (isTransientAuthReason(reason)) {
        return NextResponse.json(
          { error: "Authentication temporarily unavailable", reason },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Unauthorized", reason: reason ?? "unknown" },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") ?? "5", 10);

    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const pageSize = clampPageSize(isNaN(rawPageSize) ? 5 : rawPageSize);

    const result = await getRecentActivity(user.orgId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json(
      { error: "Failed to load activity feed" },
      { status: 500 }
    );
  }
}

function isTransientAuthReason(reason: string | undefined): boolean {
  return (
    reason === "db-unreachable" ||
    reason === "unexpected-error" ||
    reason === "clerk-auth-exception"
  );
}
