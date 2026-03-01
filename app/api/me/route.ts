import { NextResponse } from "next/server";
import { requireAuthAndOrg } from "@/lib/server/auth";

export async function GET() {
  try {
    const user = await requireAuthAndOrg();
    
    return NextResponse.json({
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      clerkUserId: user.clerkUserId,
    });
  } catch (error) {
    console.error("API /me error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
