import { Prisma } from "@prisma/client";

const JOB_CANDIDATES_SETUP_MESSAGE =
  "The database is missing the job–candidate assignments table. Run `npx prisma db push` or apply migrations (e.g. `npx prisma migrate deploy`) against this database, then try again.";

/** True when Prisma/Postgres indicates `job_candidates` / JobCandidate is not in the DB. */
export function isMissingJobCandidatesTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      const meta = error.meta as { modelName?: string; table?: string } | undefined;
      const blob = `${meta?.modelName ?? ""} ${meta?.table ?? ""}`;
      if (/jobcandidate|job_candidates/i.test(blob)) return true;
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (!/job_candidates/i.test(msg) && !/JobCandidate/i.test(msg)) return false;
  return (
    /does not exist/i.test(msg) ||
    /relation.*not exist/i.test(msg) ||
    /Unknown table/i.test(msg) ||
    /42P01/i.test(msg)
  );
}

export function jobCandidatesSchemaErrorResponse() {
  return {
    status: 503 as const,
    body: {
      error: JOB_CANDIDATES_SETUP_MESSAGE,
      code: "JOB_CANDIDATES_TABLE_MISSING",
    },
  };
}
