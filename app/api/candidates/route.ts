import { NextRequest, NextResponse } from "next/server";
import { withOrgContext } from "@/lib/server/org-context";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { dbErrorResponse } from "@/lib/server/db-error";
import { parseAndValidateCandidateCreate } from "@/lib/candidate-profile";

// GET /api/candidates - List candidates for the organization
export const GET = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const searchParams = new URL(request.url).searchParams;
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: { [key: string]: unknown } = { orgId };

    if (name) {
      where.fullName = {
        contains: name,
        mode: "insensitive",
      };
    }

    if (email) {
      where.email = {
        contains: email,
        mode: "insensitive",
      };
    }

    const [rows, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
        skip: offset,
        include: {
          jobCandidates: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { source: true },
          },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    const candidates = rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      profileUrl: r.profileUrl,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      source: r.jobCandidates[0]?.source ?? null,
    }));

    return NextResponse.json({
      candidates,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return dbErrorResponse(error, "Failed to fetch candidates");
  }
});

// POST /api/candidates - Create a new candidate
export const POST = withOrgContext(async (request: NextRequest, orgId: string) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseAndValidateCandidateCreate(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, field: parsed.field },
        { status: 400 }
      );
    }
    const v = parsed.value;

    const candidate = await prisma.candidate.create({
      data: {
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        profileUrl: v.profileUrl,
        rawCVText: v.rawCVText,
        orgId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileUrl: true,
      },
    });

    const authUser = await getAuthUserFromRequest(request).catch(() => null);
    if (authUser?.userId) {
      createAuditLog({
        orgId,
        actorUserId: authUser.userId,
        action: AUDIT_ACTIONS.CANDIDATE_ADDED,
        entityType: "CANDIDATE",
        entityId: candidate.id,
      });
    }

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return dbErrorResponse(error, "Failed to create candidate");
  }
});
