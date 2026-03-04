import { createClerkClient, verifyToken } from "@clerk/backend";
import type { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import { ensureProvisionedFromClerkData } from "./auth";

/**
 * Authenticate from request using Clerk Backend SDK (no Next.js middleware required).
 * Prefers Bearer token from the Authorization header (no handshake/cookies needed).
 * Falls back to cookie-based authenticateRequest (works locally with middleware).
 */
export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return null;
  }

  // Fast path: Bearer token — no handshake, no cookies, no middleware required.
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearer) {
    return getAuthUserFromBearerToken(bearer, secretKey, publishableKey);
  }

  // Fallback: cookie-based (works locally when clerkMiddleware is active).
  const clerkClient = createClerkClient({ secretKey, publishableKey });
  const allowedOrigins = getAllowedOrigins(request);
  const jwtKey = process.env.CLERK_JWT_KEY;
  const state = await clerkClient.authenticateRequest(request, {
    authorizedParties: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    ...(jwtKey ? { jwtKey } : {}),
  });

  if (!state.isAuthenticated || !state.toAuth) {
    if ("reason" in state && "message" in state) {
      console.warn("Clerk auth failed:", state.reason, state.message);
    }
    return null;
  }

  const auth = state.toAuth();
  const userId = auth.userId;
  if (!userId) return null;

  return fetchAndProvisionClerkUser(userId, clerkClient);
}

async function getAuthUserFromBearerToken(
  token: string,
  secretKey: string,
  publishableKey: string
): Promise<AuthUser | null> {
  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;
    if (!userId) return null;

    const clerkClient = createClerkClient({ secretKey, publishableKey });
    return fetchAndProvisionClerkUser(userId, clerkClient);
  } catch (err) {
    console.warn("Bearer token verification failed:", err);
    return null;
  }
}

async function fetchAndProvisionClerkUser(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clerkClient: any
): Promise<AuthUser | null> {
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

/** Build normalized allowed origins for Clerk azp check (request origin, Origin header, Vercel/env URLs). */
function getAllowedOrigins(request: NextRequest): string[] {
  const seen = new Set<string>();
  const add = (origin: string | null | undefined) => {
    if (!origin || typeof origin !== "string") return;
    const normalized = normalizeOrigin(origin);
    if (normalized) seen.add(normalized);
  };
  const requestOrigin = getRequestOrigin(request);
  add(requestOrigin);
  const originHeader = request.headers.get("origin");
  add(originHeader);
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) add(`https://${vercelUrl}`);
  const branchUrl = process.env.VERCEL_BRANCH_URL;
  if (branchUrl) add(`https://${branchUrl}`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) add(appUrl);
  return Array.from(seen);
}

function normalizeOrigin(origin: string): string | null {
  try {
    const u = new URL(origin);
    if (!u.origin || u.origin === "null") return null;
    return u.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
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
