import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/api/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // Temporarily disable protection until Clerk is configured
  // TODO: Re-enable protection after adding Clerk environment variables
  /*
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    if (isProtectedRoute(req)) {
      auth().protect();
    }
  }
  */
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
