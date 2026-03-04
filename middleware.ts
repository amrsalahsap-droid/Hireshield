// Clerk middleware disabled: auth.protect() can cause MIDDLEWARE_INVOCATION_FAILED
// on Vercel Edge (env or runtime). App pages use ensureProvisioned() for auth.
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
