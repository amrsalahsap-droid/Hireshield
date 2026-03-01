import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // Clerk will automatically handle authentication for non-public routes
  if (!isPublicRoute(req)) {
    // This will trigger Clerk's authentication flow
    auth();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
