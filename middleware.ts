// Clerk middleware is OFF: clerkMiddleware() causes MIDDLEWARE_INVOCATION_FAILED
// on Vercel Edge. See docs/vercel-clerk-auth.md for details and workarounds.
// With middleware disabled: auth() in Server Components throws, so the dashboard
// shows a friendly message and "Sign in again" when deployed on Vercel.
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
