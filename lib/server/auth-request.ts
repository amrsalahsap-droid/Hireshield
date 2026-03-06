import { createClerkClient, verifyToken } from "@clerk/backend";
import type { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import {
  ensureProvisionedFromClerkData,
  getProvisionedUserByClerkId,
} from "./auth";

/**
 * Authenticate from request using Clerk Backend SDK (no Next.js middleware required).
 *
 * Two paths:
 * 1. Bearer token present → verifyToken(token, { secretKey, jwtKey? }).
 *    When CLERK_JWT_KEY (PEM public key) is set the verification is fully networkless.
 *    Without it the SDK fetches JWKS from Clerk's servers, which works in production
 *    but can fail locally if the network call is blocked (returns "unexpected-error").
 *    Set CLERK_JWT_KEY in your local .env to eliminate this dependency.
 * 2. No bearer token → authenticateRequest(request) cookie path (local dev fallback).
 *    Optionally uses CLERK_JWT_KEY for networkless verification if set.
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
  const authHeader = request.headers.get("authorization");
  const hasBearerToken = authHeader?.startsWith("Bearer ") ?? false;

  // Fast path: bearer token verification.
  // When CLERK_JWT_KEY (PEM public key) is set, verification is fully networkless.
  // Without it, the SDK fetches JWKS from Clerk's servers — works in production
  // but may fail locally if the network request is blocked or slow.
  if (hasBearerToken) {
    const token = authHeader!.slice(7);
    const jwtKey = process.env.CLERK_JWT_KEY;
    try {
      const payload = await verifyToken(token, {
        secretKey,
        ...(jwtKey ? { jwtKey } : {}),
      });
      const userId = payload.sub;
      if (!userId) return { user: null, reason: "no-user-id" };
      try {
        const user = await fetchAndProvisionClerkUser(userId, clerkClient);
        if (!user) return { user: null, reason: "provision-failed" };
        return { user };
      } catch (err) {
        console.error("Failed to provision user (bearer path):", err);
        return {
          user: null,
          reason: isDbUnavailableError(err) ? "db-unreachable" : "provision-failed",
        };
      }
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
      // Network/JWKS failures are transient — surface as unexpected-error (→ 503) so
      // the client shows a retry prompt rather than "Sign in again".
      const isTransient =
        message.includes("jwks") ||
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("connect") ||
        message.includes("timeout");
      const reason = isTransient ? "unexpected-error" : "session-token-invalid";
      console.error("Bearer token verification failed", { message, reason, hasJwtKey: !!jwtKey });
      return { user: null, reason };
    }
  }

  // Cookie path fallback: used when no bearer token is present (e.g. local dev without client-side auth).
  const jwtKey = process.env.CLERK_JWT_KEY;
  let state: Awaited<ReturnType<typeof clerkClient.authenticateRequest>>;
  try {
    state = await clerkClient.authenticateRequest(request, {
      ...(jwtKey ? { jwtKey } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown authenticateRequest error";
    console.error("Clerk authenticateRequest threw", {
      reason: "clerk-auth-exception",
      message,
    });
    return { user: null, reason: "clerk-auth-exception" };
  }

  if (!state.isAuthenticated || !state.toAuth) {
    const s = state as { reason?: string; message?: string; status?: string };
    const reason = normalizeClerkFailureReason(s.reason, s.status);
    console.warn("Clerk auth failed (cookie path)", {
      reason,
      rawReason: s.reason ?? null,
      clerkStatus: s.status ?? null,
      message: s.message ?? null,
    });
    return { user: null, reason };
  }

  const auth = state.toAuth();
  const userId = auth.userId;
  if (!userId) return { user: null, reason: "no-user-id" };

  try {
    const user = await fetchAndProvisionClerkUser(userId, clerkClient);
    if (!user) {
      return { user: null, reason: "provision-failed" };
    }
    return { user };
  } catch (err) {
    console.error("Failed to provision user (cookie path):", err);
    return {
      user: null,
      reason: isDbUnavailableError(err) ? "db-unreachable" : "provision-failed",
    };
  }
}

function normalizeClerkFailureReason(
  reason: string | undefined,
  status: string | undefined
): string {
  const raw = (reason ?? status ?? "unknown").toLowerCase();
  if (raw === "unexpected-error") return "unexpected-error";
  if (raw === "client-error") return "unexpected-error";
  if (raw === "network-error") return "unexpected-error";
  if (raw === "server-error") return "unexpected-error";
  return reason ?? status ?? "unknown";
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

function isDbUnavailableError(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "";
  const message = e?.message ?? "";
  return (
    name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server")
  );
}
