import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequestWithReason } from "@/lib/server/auth-request";
import { getDashboardJobsSummary } from "@/lib/server/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, reason } = await getAuthUserFromRequestWithReason(request);
    if (!user) {
      if (reason === "db-unreachable") {
        return NextResponse.json(
          { error: "Database unavailable", reason },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Unauthorized", reason: reason ?? "unknown" },
        { status: 401 }
      );
    }
    const summary = await getDashboardJobsSummary(user.orgId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
