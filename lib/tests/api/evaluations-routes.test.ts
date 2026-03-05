import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/org-context", () => ({
  withOrgContext: (handler: unknown) => handler,
}));

vi.mock("@/lib/schemas/candidate-signals", () => ({
  CandidateSignals_v1: {
    parse: vi.fn((value: unknown) => value),
  },
}));

vi.mock("@/lib/schemas/final-score", () => ({
  FinalScore_v1: {
    parse: vi.fn((value: unknown) => value),
  },
}));

vi.mock("@/lib/server/ai/call", () => ({
  callLLMAndParseJSON: vi.fn(),
}));

vi.mock("@/lib/prompts/candidate_signals_v1", () => ({
  candidateSignalsExtractorV1: {
    id: "candidate_signals_v1",
    version: "1.0",
    build: vi.fn(() => ({ system: "", user: "" })),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    job: { findFirst: vi.fn() },
    candidate: { findFirst: vi.fn() },
    interview: { findFirst: vi.fn() },
  },
}));

describe("Evaluations API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/evaluations recentCompleted", () => {
    it("returns only valid completed evaluations with normalized metrics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/evaluations/route");
      const mockPrisma = vi.mocked(prisma);

      mockPrisma.evaluation.findMany.mockResolvedValue([
        {
          id: "ev-valid-1",
          jobId: "job-1",
          candidateId: "cand-1",
          completedAt: new Date("2026-03-01T10:00:00.000Z"),
          updatedAt: new Date("2026-03-01T10:00:01.000Z"),
          finalScoreJson: { finalScore: 101.2, riskLevel: "green" },
          job: { id: "job-1", title: "Backend Engineer", status: "ACTIVE" },
          candidate: { id: "cand-1", fullName: "Sam Lee", email: "sam@example.com" },
        },
        {
          id: "ev-valid-2",
          jobId: "job-2",
          candidateId: "cand-2",
          completedAt: new Date("2026-03-01T09:00:00.000Z"),
          updatedAt: new Date("2026-03-01T09:00:01.000Z"),
          finalScoreJson: { finalScore: 42.6, riskLevel: "YELLOW" },
          job: { id: "job-2", title: "Product Manager", status: "ACTIVE" },
          candidate: { id: "cand-2", fullName: "Mina Ali", email: null },
        },
        {
          id: "ev-invalid-score",
          jobId: "job-3",
          candidateId: "cand-3",
          completedAt: new Date("2026-03-01T08:00:00.000Z"),
          updatedAt: new Date("2026-03-01T08:00:01.000Z"),
          finalScoreJson: { finalScore: "bad", riskLevel: "GREEN" },
          job: { id: "job-3", title: "Designer", status: "ACTIVE" },
          candidate: { id: "cand-3", fullName: "Invalid Score", email: null },
        },
        {
          id: "ev-invalid-risk",
          jobId: "job-4",
          candidateId: "cand-4",
          completedAt: new Date("2026-03-01T07:00:00.000Z"),
          updatedAt: new Date("2026-03-01T07:00:01.000Z"),
          finalScoreJson: { finalScore: 77, riskLevel: "BLUE" },
          job: { id: "job-4", title: "DevOps", status: "ACTIVE" },
          candidate: { id: "cand-4", fullName: "Invalid Risk", email: null },
        },
      ] as never[]);

      const request = new Request(
        "http://localhost/api/evaluations?recentCompleted=1"
      ) as unknown as Parameters<typeof GET>[0];
      const response = await GET(request, "org-123");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId: "org-123",
            status: "COMPLETED",
            completedAt: { not: null },
          },
          orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
          take: 5,
        })
      );
      expect(body.pagination).toEqual({
        total: 2,
        limit: 5,
        offset: 0,
        hasMore: false,
      });
      expect(body.evaluations).toHaveLength(2);
      expect(body.evaluations[0]).toMatchObject({
        id: "ev-valid-1",
        score: 100,
        riskLevel: "GREEN",
      });
      expect(body.evaluations[1]).toMatchObject({
        id: "ev-valid-2",
        score: 43,
        riskLevel: "YELLOW",
      });
    });
  });

  describe("PUT /api/evaluations/[id]", () => {
    it("marks evaluation completed when finalScoreJson is provided", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { PUT } = await import("@/app/api/evaluations/[id]/route");
      const mockPrisma = vi.mocked(prisma);

      mockPrisma.evaluation.findFirst.mockResolvedValue({
        id: "ev-1",
        orgId: "org-123",
      } as never);
      mockPrisma.evaluation.update.mockResolvedValue({
        id: "ev-1",
        status: "COMPLETED",
      } as never);

      const request = new Request("http://localhost/api/evaluations/ev-1", {
        method: "PUT",
        body: JSON.stringify({
          finalScoreJson: { finalScore: 85, riskLevel: "GREEN" },
        }),
        headers: { "content-type": "application/json" },
      }) as unknown as Parameters<typeof PUT>[0];

      const response = await PUT(request, "org-123", { params: { id: "ev-1" } });

      expect(response.status).toBe(200);
      expect(mockPrisma.evaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ev-1" },
          data: expect.objectContaining({
            finalScoreJson: { finalScore: 85, riskLevel: "GREEN" },
            status: "COMPLETED",
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it("resets evaluation to pending when finalScoreJson is null", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { PUT } = await import("@/app/api/evaluations/[id]/route");
      const mockPrisma = vi.mocked(prisma);

      mockPrisma.evaluation.findFirst.mockResolvedValue({
        id: "ev-2",
        orgId: "org-123",
      } as never);
      mockPrisma.evaluation.update.mockResolvedValue({
        id: "ev-2",
        status: "PENDING",
      } as never);

      const request = new Request("http://localhost/api/evaluations/ev-2", {
        method: "PUT",
        body: JSON.stringify({
          finalScoreJson: null,
        }),
        headers: { "content-type": "application/json" },
      }) as unknown as Parameters<typeof PUT>[0];

      const response = await PUT(request, "org-123", { params: { id: "ev-2" } });

      expect(response.status).toBe(200);
      expect(mockPrisma.evaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ev-2" },
          data: expect.objectContaining({
            finalScoreJson: null,
            status: "PENDING",
            completedAt: null,
          }),
        })
      );
    });
  });
});
