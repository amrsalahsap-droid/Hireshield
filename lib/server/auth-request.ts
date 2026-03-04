import { createClerkClient } from "@clerk/backend";
import type { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import { ensureProvisionedFromClerkData } from "./auth";

/**
 * Authenticate from request using Clerk Backend SDK (no Next.js middleware required).
 *
 * When the client sends "Authorization: Bearer <token>", Clerk's authenticateRequest
 * uses that header directly — no cookie handshake, no azp check needed.
 * When no Bearer header is present (e.g. local dev with cookies), we fall back to the
 * cookie path with authorizedParties to handle the azp claim.
 */
export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return null;
  }

  const clerkClient = createClerkClient({ secretKey, publishableKey });
  const jwtKey = process.env.CLERK_JWT_KEY;

  // When a Bearer token is present, skip the azp/authorizedParties check entirely —
  // the token's signature is sufficient proof of identity and the handshake is never
  // triggered for Authorization-header requests.
  const hasBearerToken = request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
  const allowedOrigins = hasBearerToken ? [] : getAllowedOrigins(request);

  const state = await clerkClient.authenticateRequest(request, {
    ...(allowedOrigins.length > 0 ? { authorizedParties: allowedOrigins } : {}),
    ...(jwtKey ? { jwtKey } : {}),
  });

  if (!state.isAuthenticated || !state.toAuth) {
    if ("reason" in state && "message" in state) {
      console.warn("Clerk auth failed:", (state as { reason?: string; message?: string }).reason, (state as { reason?: string; message?: string }).message);
    }
    return null;
  }

  const auth = state.toAuth();
  const userId = auth.userId;
  if (!userId) return null;

  return fetchAndProvisionClerkUser(userId, clerkClient);
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
