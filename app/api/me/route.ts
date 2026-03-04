import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Request-based auth works without Clerk middleware (e.g. on Vercel)
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      clerkUserId: user.clerkUserId,
    });
  } catch (error) {
    console.error("API /me error:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
