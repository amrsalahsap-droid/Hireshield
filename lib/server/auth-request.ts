import { createClerkClient } from "@clerk/backend";
import type { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import {
  ensureProvisionedFromClerkData,
  getProvisionedUserByClerkId,
} from "./auth";

/**
 * Authenticate from request using Clerk Backend SDK (no Next.js middleware required).
 *
 * When the client sends "Authorization: Bearer <token>", we strip cookies from the
 * request before passing to authenticateRequest so Clerk is forced onto the Bearer
 * path (preventing the cookie handshake from overriding it).
 * When no Bearer header is present (local dev with middleware), we still allow
 * cookie auth; authorizedParties checks are intentionally disabled because they
 * have been causing false negatives on Vercel domains.
 *
 * Returns the AuthUser on success, or null with a reason string on failure.
 */
export async function getAuthUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  const result = await getAuthUserFromRequestWithReason(request);
  return result.user;
}

export async function getAuthUserFromRequestWithReason(
  request: NextRequest
): Promise<{ user: AuthUser | null; reason?: string }> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return { user: null, reason: "missing-env" };
  }

  const clerkClient = createClerkClient({ secretKey, publishableKey });
  const jwtKey = process.env.CLERK_JWT_KEY;
  const authHeader = request.headers.get("authorization");
  const hasBearerToken = authHeader?.startsWith("Bearer ") ?? false;

  let requestForAuth: Request;
  if (hasBearerToken) {
    // Keep all headers except cookie so Clerk stays on Bearer auth path
    // while preserving Origin/Host context for azp validation.
    const strippedHeaders = new Headers(request.headers);
    strippedHeaders.delete("cookie");
    requestForAuth = new Request(request.url, {
      method: request.method,
      headers: strippedHeaders,
    });
  } else {
    requestForAuth = request;
  }

  const state = await clerkClient.authenticateRequest(requestForAuth, {
    ...(jwtKey ? { jwtKey } : {}),
  });

  if (!state.isAuthenticated || !state.toAuth) {
    const s = state as { reason?: string; message?: string; status?: string };
    const reason = s.reason ?? s.status ?? "unknown";
    console.warn(
      "Clerk auth failed — reason:",
      reason,
      "message:",
      s.message ?? "(none)"
    );
    return { user: null, reason };
  }

  const auth = state.toAuth();
  const userId = auth.userId;
  if (!userId) return { user: null, reason: "no-user-id" };

  try {
    const user = await fetchAndProvisionClerkUser(userId, clerkClient);
    return { user };
  } catch (err) {
    console.error("Failed to provision user:", err);
    return { user: null, reason: "provision-failed" };
  }
}

async function fetchAndProvisionClerkUser(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clerkClient: any
): Promise<AuthUser | null> {
  // Fast path: most requests are for already-provisioned users.
  const existing = await getProvisionedUserByClerkId(userId);
  if (existing) {
    return existing;
  }

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
