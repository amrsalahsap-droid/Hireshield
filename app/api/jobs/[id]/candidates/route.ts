import { NextRequest, NextResponse } from "next/server";
import { AssignmentSource, CandidateStage, JobStatus } from "@prisma/client";

const VALID_SOURCES = new Set(Object.values(AssignmentSource));
import { withOrgContext } from "@/lib/server/org-context";
import { prisma } from "@/lib/prisma";
import { updateCandidateStage } from "@/lib/server/candidate-stages";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";
import { resolveJobCandidatesRouteError } from "@/lib/server/job-candidates-api-errors";

const VALID_STAGES = new Set(Object.values(CandidateStage));

/** GET /api/jobs/[id]/candidates — candidates assigned to this job */
export const GET = withOrgContext(
  async (
    request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const jobId = params.id;
      if (!jobId) {
        return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({ where: { id: jobId, orgId } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const rows = await prisma.jobCandidate.findMany({
        where: { jobId },
        include: {
          candidate: {
            select: { id: true, fullName: true, email: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        assignments: rows.map((r) => ({
          id: r.id,
          stage: r.stage,
          source: r.source,
          addedBy: r.addedBy,
          notes: r.notes,
          createdAt: r.createdAt,
          candidate: r.candidate,
        })),
      });
    } catch (error) {
      console.error("[JOB_CANDIDATES][GET]", error);
      const { status, body } = resolveJobCandidatesRouteError(
        error,
        "Failed to list job candidates"
      );
      return NextResponse.json(body, { status });
    }
  }
);

/**
 * POST /api/jobs/[id]/candidates
 * Body: { candidateId: string } OR { fullName, email?, rawCVText? } (create + assign)
 */
export const POST = withOrgContext(
  async (
    request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const jobId = params.id;
      if (!jobId) {
        return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({ where: { id: jobId, orgId } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (job.status !== JobStatus.ACTIVE) {
        return NextResponse.json(
          { error: "Job must be Active to add candidates" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate shared optional metadata fields
      const source: AssignmentSource =
        body.source != null && VALID_SOURCES.has(body.source)
          ? (body.source as AssignmentSource)
          : AssignmentSource.MANUAL;
      const notes: string | null =
        typeof body.notes === "string" && body.notes.trim().length > 0
          ? body.notes.trim()
          : null;

      const authUser = await getAuthUserFromRequest(request).catch(() => null);
      const addedBy: string | null = authUser?.userId ?? null;

      if (body.candidateId != null && typeof body.candidateId === "string") {
        const candidateId = body.candidateId.trim();
        if (!candidateId) {
          return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
        }

        const dup = await prisma.jobCandidate.findUnique({
          where: { jobId_candidateId: { jobId, candidateId } },
        });
        if (dup) {
          return NextResponse.json(
            { error: "This candidate is already assigned to this job.", code: "DUPLICATE" },
            { status: 409 }
          );
        }

        const candidate = await prisma.candidate.findFirst({
          where: { id: candidateId, orgId },
        });
        if (!candidate) {
          return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        const jc = await prisma.jobCandidate.create({
          data: { jobId, candidateId: candidate.id, source, addedBy, notes },
          include: {
            candidate: { select: { id: true, fullName: true, email: true } },
          },
        });

        await updateCandidateStage(jobId, candidate.id, "candidate_added");

        if (authUser?.userId) {
          await createAuditLog({
            orgId,
            actorUserId: authUser.userId,
            action: AUDIT_ACTIONS.CANDIDATE_ASSIGNED_TO_JOB,
            entityType: "JOB_CANDIDATE",
            entityId: jc.id,
          });
        }

        return NextResponse.json(
          {
            assignment: {
              id: jc.id,
              stage: jc.stage,
              source: jc.source,
              addedBy: jc.addedBy,
              notes: jc.notes,
              createdAt: jc.createdAt,
              candidate: jc.candidate,
            },
          },
          { status: 201 }
        );
      }

      const { fullName, email, rawCVText } = body;

      if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
        return NextResponse.json(
          { error: "Full name is required and must be a non-empty string" },
          { status: 400 }
        );
      }
      if (fullName.length > 200) {
        return NextResponse.json(
          { error: "Full name must be less than 200 characters" },
          { status: 400 }
        );
      }
      if (email != null && typeof email !== "string") {
        return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Email must be a valid email address" }, { status: 400 });
      }
      if (rawCVText != null && typeof rawCVText !== "string") {
        return NextResponse.json({ error: "rawCVText must be a string" }, { status: 400 });
      }
      if (rawCVText && rawCVText.length > 20000) {
        return NextResponse.json(
          { error: "CV text must be less than 20,000 characters" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            fullName: fullName.trim(),
            email: email?.trim() || null,
            rawCVText: typeof rawCVText === "string" ? rawCVText : "",
            orgId,
          },
          select: { id: true, fullName: true, email: true },
        });

        const jc = await tx.jobCandidate.create({
          data: { jobId, candidateId: candidate.id, source, addedBy, notes },
          include: {
            candidate: { select: { id: true, fullName: true, email: true } },
          },
        });

        return { candidate, jc };
      });

      await updateCandidateStage(jobId, result.candidate.id, "candidate_added");

      if (authUser?.userId) {
        await createAuditLog({
          orgId,
          actorUserId: authUser.userId,
          action: AUDIT_ACTIONS.CANDIDATE_ADDED,
          entityType: "CANDIDATE",
          entityId: result.candidate.id,
        });
        await createAuditLog({
          orgId,
          actorUserId: authUser.userId,
          action: AUDIT_ACTIONS.CANDIDATE_ASSIGNED_TO_JOB,
          entityType: "JOB_CANDIDATE",
          entityId: result.jc.id,
        });
      }

      return NextResponse.json(
        {
          candidate: result.candidate,
          assignment: {
            id: result.jc.id,
            stage: result.jc.stage,
            source: result.jc.source,
            addedBy: result.jc.addedBy,
            notes: result.jc.notes,
            createdAt: result.jc.createdAt,
            candidate: result.jc.candidate,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("[JOB_CANDIDATES][POST]", error);
      const { status, body } = resolveJobCandidatesRouteError(
        error,
        "Failed to assign candidate to job"
      );
      return NextResponse.json(body, { status });
    }
  }
);

/**
 * PATCH /api/jobs/[id]/candidates
 * Body: { assignmentId: string, stage: CandidateStage }
 */
export const PATCH = withOrgContext(
  async (
    request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const jobId = params.id;
      if (!jobId) {
        return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({ where: { id: jobId, orgId } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const body = await request.json();
      const { assignmentId, stage } = body;

      if (!assignmentId || typeof assignmentId !== "string") {
        return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
      }
      if (!stage || !VALID_STAGES.has(stage)) {
        return NextResponse.json(
          { error: `stage must be one of: ${[...VALID_STAGES].join(", ")}` },
          { status: 400 }
        );
      }

      const existing = await prisma.jobCandidate.findFirst({
        where: { id: assignmentId, jobId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      const updated = await prisma.jobCandidate.update({
        where: { id: assignmentId },
        data: { stage: stage as CandidateStage, updatedAt: new Date() },
        select: { id: true, stage: true, updatedAt: true },
      });

      const authUser = await getAuthUserFromRequest(request).catch(() => null);
      if (authUser?.userId) {
        await createAuditLog({
          orgId,
          actorUserId: authUser.userId,
          action: "CANDIDATE_STAGE_UPDATED",
          entityType: "JOB_CANDIDATE",
          entityId: assignmentId,
        });
      }

      return NextResponse.json({ assignment: updated });
    } catch (error) {
      console.error("[JOB_CANDIDATES][PATCH]", error);
      const { status, body } = resolveJobCandidatesRouteError(
        error,
        "Failed to update candidate stage"
      );
      return NextResponse.json(body, { status });
    }
  }
);

/**
 * DELETE /api/jobs/[id]/candidates
 * Body: { assignmentId: string }
 */
export const DELETE = withOrgContext(
  async (
    request: NextRequest,
    orgId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const jobId = params.id;
      if (!jobId) {
        return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({ where: { id: jobId, orgId } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const body = await request.json();
      const { assignmentId } = body;

      if (!assignmentId || typeof assignmentId !== "string") {
        return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
      }

      const existing = await prisma.jobCandidate.findFirst({
        where: { id: assignmentId, jobId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      await prisma.jobCandidate.delete({ where: { id: assignmentId } });

      const authUser = await getAuthUserFromRequest(request).catch(() => null);
      if (authUser?.userId) {
        await createAuditLog({
          orgId,
          actorUserId: authUser.userId,
          action: "CANDIDATE_REMOVED_FROM_JOB",
          entityType: "JOB_CANDIDATE",
          entityId: assignmentId,
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[JOB_CANDIDATES][DELETE]", error);
      const { status, body } = resolveJobCandidatesRouteError(
        error,
        "Failed to remove candidate from job"
      );
      return NextResponse.json(body, { status });
    }
  }
);
