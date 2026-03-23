import { describe, it, expect, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { resolveJobCandidatesRouteError } from "./job-candidates-api-errors";

describe("resolveJobCandidatesRouteError", () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it("returns 503 for missing job_candidates (P2021 JobCandidate)", () => {
    const err = new Prisma.PrismaClientKnownRequestError("The table does not exist", {
      code: "P2021",
      clientVersion: "test",
      meta: { modelName: "JobCandidate" },
    });
    const { status, body } = resolveJobCandidatesRouteError(err, "Failed");
    expect(status).toBe(503);
    expect(body.code).toBe("JOB_CANDIDATES_TABLE_MISSING");
  });

  it("maps P2002 to 409 DUPLICATE", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["email"] },
    });
    const { status, body } = resolveJobCandidatesRouteError(err, "Failed");
    expect(status).toBe(409);
    expect(body.code).toBe("DUPLICATE");
  });

  it("maps P2003 to 400 FOREIGN_KEY_VIOLATION", () => {
    const err = new Prisma.PrismaClientKnownRequestError("FK", {
      code: "P2003",
      clientVersion: "test",
      meta: { field_name: "jobId" },
    });
    const { status, body } = resolveJobCandidatesRouteError(err, "Failed");
    expect(status).toBe(400);
    expect(body.code).toBe("FOREIGN_KEY_VIOLATION");
  });

  it("maps SyntaxError to 400 Invalid JSON body", () => {
    const { status, body } = resolveJobCandidatesRouteError(
      new SyntaxError("bad json"),
      "Failed"
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("in development includes prismaCode for unmapped Prisma errors", () => {
    process.env.NODE_ENV = "development";
    const err = new Prisma.PrismaClientKnownRequestError("other", {
      code: "P1999",
      clientVersion: "test",
      meta: { foo: "bar" },
    });
    const { status, body } = resolveJobCandidatesRouteError(err, "Default msg");
    expect(status).toBe(500);
    expect(body.error).toBe("Default msg");
    expect(body.prismaCode).toBe("P1999");
    expect(body.meta).toEqual({ foo: "bar" });
  });
});
