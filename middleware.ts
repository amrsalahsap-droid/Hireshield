// Use clerkMiddleware() so auth() works in Server Components (Clerk requires it).
// We do NOT call auth.protect() here to avoid MIDDLEWARE_INVOCATION_FAILED on Vercel Edge;
// app pages (e.g. dashboard) check auth and redirect to /auth when no session.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
