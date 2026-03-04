import { createClerkClient } from "@clerk/backend";
import type { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import { ensureProvisionedFromClerkData } from "./auth";

/**
 * Authenticate from request using Clerk Backend SDK (no Next.js middleware required).
 * Use this in Route Handlers when clerkMiddleware is disabled (e.g. to avoid Vercel Edge 500).
 */
export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return null;
  }

  const clerkClient = createClerkClient({
    secretKey,
    publishableKey,
  });

  const origin = getRequestOrigin(request);
  const state = await clerkClient.authenticateRequest(request, {
    authorizedParties: origin ? [origin] : undefined,
  });

  if (!state.isAuthenticated || !state.toAuth) {
    return null;
  }

  const auth = state.toAuth();
  const userId = auth.userId;
  if (!userId) return null;

  const user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.emailAddresses?.find(
    (e: { id: string }) => e.id === user.primaryEmailAddressId
  );
  const email =
    (primaryEmail as { emailAddress?: string } | undefined)?.emailAddress ??
    (user.emailAddresses?.[0] as { emailAddress?: string } | undefined)?.emailAddress;
  if (!email) {
    console.error("Clerk user has no email:", userId);
    return null;
  }

  const name =
    user.firstName || user.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null
      : null;

  return ensureProvisionedFromClerkData(userId, email, name);
}

function getRequestOrigin(request: NextRequest): string | null {
  try {
    const url = request.url;
    if (!url) return null;
    const u = new URL(url);
    return u.origin;
  } catch {
    return null;
  }
}
