import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search jobs and candidates in parallel (without authentication for global search)
    const [jobs, candidates] = await Promise.all([
      // Search jobs
      prisma.job.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { rawJD: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),

      // Search candidates
      prisma.candidate.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { rawCVText: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Format results
    const results = [
      ...jobs.map((job) => ({
        type: "job",
        id: job.id,
        title: job.title,
        description: `${job.status} • Updated ${new Date(job.updatedAt).toLocaleDateString()}`,
        href: `/app/jobs/${job.id}`,
      })),
      ...candidates.map((candidate) => ({
        type: "candidate",
        id: candidate.id,
        title: candidate.fullName,
        description: candidate.email || `Added ${new Date(candidate.createdAt).toLocaleDateString()}`,
        href: `/app/candidates/${candidate.id}`,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
