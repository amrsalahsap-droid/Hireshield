import { NextResponse } from "next/server";

/**
 * Detect whether an error indicates the database server is unreachable.
 * Covers Prisma cold-start failures, TCP connection refusals, and DNS
 * resolution errors against the configured DB host.
 */
export function isDbUnreachable(err: unknown): boolean {
  const e = err as { name?: string; message?: string; code?: string };
  const name = e?.name ?? "";
  const msg = e?.message ?? "";

  if (name === "PrismaClientInitializationError") return true;
  if (msg.includes("Can't reach database server")) return true;
  if (msg.includes("Connection refused")) return true;
  if (msg.includes("ECONNREFUSED")) return true;
  if (msg.includes("ETIMEDOUT")) return true;
  if (msg.includes("getaddrinfo ENOTFOUND")) return true;

  return false;
}

export interface ClassifiedDbError {
  status: number;
  code: string;
  message: string;
}

/**
 * Classify an error as either DB-unreachable (503) or a generic internal
 * error (500), returning a machine-readable code the client can branch on.
 */
export function classifyDbError(
  err: unknown,
  fallbackMessage = "An unexpected error occurred"
): ClassifiedDbError {
  if (isDbUnreachable(err)) {
    return {
      status: 503,
      code: "DB_UNREACHABLE",
      message: "Database is temporarily unavailable. Please try again shortly.",
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: fallbackMessage,
  };
}

/**
 * Build a NextResponse from a classified DB error, including a Retry-After
 * header for 503s so well-behaved clients can back off automatically.
 */
export function dbErrorResponse(
  err: unknown,
  fallbackMessage?: string
): NextResponse {
  const classified = classifyDbError(err, fallbackMessage);
  const body: Record<string, string> = {
    error: classified.message,
    code: classified.code,
  };
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    body.details = err.message;
  }
  const res = NextResponse.json(body, { status: classified.status });
  if (classified.status === 503) {
    res.headers.set("Retry-After", "10");
  }
  return res;
}
