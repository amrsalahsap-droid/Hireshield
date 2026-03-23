import { Prisma } from "@prisma/client";
import {
  isMissingJobCandidatesTable,
  jobCandidatesSchemaErrorResponse,
} from "@/lib/server/prisma-job-candidates-schema";

/**
 * Maps errors from job-candidates API routes to HTTP status + JSON body.
 * In development, includes Prisma codes / messages for easier debugging.
 */
export function resolveJobCandidatesRouteError(
  error: unknown,
  defaultMessage: string
): { status: number; body: Record<string, unknown> } {
  const isDev = process.env.NODE_ENV !== "production";

  if (isMissingJobCandidatesTable(error)) {
    return jobCandidatesSchemaErrorResponse();
  }

  if (error instanceof SyntaxError) {
    return { status: 400, body: { error: "Invalid JSON body" } };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        status: 409,
        body: {
          error: "A record with this information already exists.",
          code: "DUPLICATE",
          ...(isDev ? { prismaCode: error.code, meta: error.meta } : {}),
        },
      };
    }
    if (error.code === "P2003") {
      return {
        status: 400,
        body: {
          error: "Could not save: related record is missing or invalid.",
          code: "FOREIGN_KEY_VIOLATION",
          ...(isDev ? { prismaCode: error.code, meta: error.meta } : {}),
        },
      };
    }
  }

  const body: Record<string, unknown> = { error: defaultMessage };

  if (isDev) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      body.prismaCode = error.code;
      body.meta = error.meta;
      body.message = error.message;
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      body.message = error.message;
    } else if (error instanceof Error) {
      body.message = error.message;
      body.name = error.name;
    } else {
      body.message = String(error);
    }
  }

  return { status: 500, body };
}
