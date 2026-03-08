import { NextRequest, NextResponse } from "next/server";
import { getDashboardJobsSummary } from "@/lib/server/dashboard";

// Development-only endpoint to bypass authentication for testing
export async function GET(request: NextRequest) {
  // Only allow this in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Use the demo org ID directly for testing
    const demoOrgId = "cmm87bloy0000v9nvvzyt6aqn";
    const summary = await getDashboardJobsSummary(demoOrgId);
    
    return NextResponse.json({
      ...summary,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("GET /api/dashboard-dev error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
