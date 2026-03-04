// Clerk middleware disabled: clerkMiddleware() causes MIDDLEWARE_INVOCATION_FAILED
// on Vercel Edge. With it disabled, auth() in Server Components will throw and the
// dashboard shows "Authentication error" — set up auth via API or run app routes elsewhere.
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
