import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";
import { getDashboardJobsSummary } from "@/lib/server/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
