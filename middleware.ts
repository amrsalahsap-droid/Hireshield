// Minimal Clerk middleware so auth() works in Server Components.
// If you see MIDDLEWARE_INVOCATION_FAILED on Vercel, ensure CLERK_SECRET_KEY and
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are set in Vercel project environment.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
