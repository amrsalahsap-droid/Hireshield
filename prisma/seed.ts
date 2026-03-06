import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';

const prisma = new PrismaClient();

async function seedActivityData(orgId: string, actorUserId: string, jobs: { id: string; title: string }[], candidates: { id: string; fullName: string }[], evaluationIds: string[]) {
  console.log('\n  Seeding Recent Activity audit log entries...');

  const AUDIT_ACTIONS = {
    JOB_JD_ANALYZE_COMPLETED: 'JOB_JD_ANALYZE_COMPLETED',
    JOB_INTERVIEW_KIT_COMPLETED: 'JOB_INTERVIEW_KIT_COMPLETED',
    CANDIDATE_EVALUATED: 'CANDIDATE_EVALUATED',
    CANDIDATE_ADDED: 'CANDIDATE_ADDED',
  };

  const now = Date.now();
  const entries = [
    // JD analyzed for each job
    ...jobs.map((job, i) => ({
      orgId, actorUserId,
      action: AUDIT_ACTIONS.JOB_JD_ANALYZE_COMPLETED,
      entityType: 'JOB', entityId: job.id,
      createdAt: new Date(now - (i + 1) * 10 * 60 * 1000),
    })),
    // Interview kit generated for each job
    ...jobs.map((job, i) => ({
      orgId, actorUserId,
      action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED,
      entityType: 'JOB', entityId: job.id,
      createdAt: new Date(now - (i + 3) * 10 * 60 * 1000),
    })),
    // Candidate added for each candidate
    ...candidates.slice(0, 3).map((candidate, i) => ({
      orgId, actorUserId,
      action: AUDIT_ACTIONS.CANDIDATE_ADDED,
      entityType: 'CANDIDATE', entityId: candidate.id,
      createdAt: new Date(now - (i + 5) * 10 * 60 * 1000),
    })),
    // Candidate evaluated for completed evaluations
    ...evaluationIds.slice(0, 3).map((evalId, i) => ({
      orgId, actorUserId,
      action: AUDIT_ACTIONS.CANDIDATE_EVALUATED,
      entityType: 'EVALUATION', entityId: evalId,
      createdAt: new Date(now - (i + 8) * 10 * 60 * 1000),
    })),
  ];

  for (const entry of entries) {
    // Check if a matching entry already exists to keep the seed idempotent
    const existing = await prisma.auditLog.findFirst({
      where: { orgId, action: entry.action, entityId: entry.entityId },
    });
    if (!existing) {
      await prisma.auditLog.create({
        data: {
          orgId: entry.orgId,
          actorUserId: entry.actorUserId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadataJson: { timestamp: entry.createdAt.toISOString() },
        },
      });
    }
  }
  console.log(`  Created ${entries.length} audit log entries (skipped existing)`);
}

async function seedDashboardData(orgId: string, actorUserId: string) {
  console.log(`\nSeeding dashboard test data for org: ${orgId}`);

  // ---------- Jobs ----------
  const jobTitles = [
    { title: 'Senior Frontend Engineer', status: 'ACTIVE' as const },
    { title: 'Backend API Developer',    status: 'ACTIVE' as const },
  ];

  const jobs = await Promise.all(
    jobTitles.map(async ({ title, status }) => {
      const existing = await prisma.job.findFirst({ where: { orgId, title } });
      if (existing) return existing;
      return prisma.job.create({
        data: {
          orgId,
          title,
          status,
          jdAnalysisStatus: 'DONE',
          interviewKitStatus: 'DONE',
          jdExtractionJson: { seniorityLevel: 'Senior', requiredSkills: ['TypeScript', 'React'] },
        },
      });
    }),
  );
  console.log(`  Jobs: ${jobs.map((j) => j.title).join(', ')}`);

  // ---------- Candidates ----------
  const candidateDefs = [
    { fullName: 'Alice Johnson',  email: 'alice@example.com' },
    { fullName: 'Bob Martinez',   email: 'bob@example.com'   },
    { fullName: 'Carol Chen',     email: 'carol@example.com' },
    { fullName: 'David Kim',      email: 'david@example.com' },
    { fullName: 'Eva Müller',     email: 'eva@example.com'   },
    { fullName: 'Frank Torres',   email: 'frank@example.com' },
    { fullName: 'Grace Lee',      email: 'grace@example.com' },
    { fullName: 'Henry Brown',    email: 'henry@example.com' },
    { fullName: 'Iris Patel',     email: 'iris@example.com'  },
  ];

  const candidates = await Promise.all(
    candidateDefs.map(async ({ fullName, email }) => {
      const existing = await prisma.candidate.findFirst({ where: { orgId, email } });
      if (existing) return existing;
      return prisma.candidate.create({
        data: { orgId, fullName, email, rawCVText: `CV for ${fullName}. Experienced software engineer.` },
      });
    }),
  );
  console.log(`  Candidates: ${candidates.map((c) => c.fullName).join(', ')}`);

  const [alice, bob, carol, david, eva, frank, grace, henry, iris] = candidates;
  const [frontendJob, backendJob] = jobs;

  // ---------- Interviews (to give some candidates a transcript) ----------
  const interviewDefs = [
    { candidate: alice, job: frontendJob, transcript: 'Interviewer: Tell me about React hooks.\nAlice: I use useState and useEffect extensively...' },
    { candidate: bob,   job: backendJob,  transcript: 'Interviewer: Describe your API design approach.\nBob: I follow REST principles and use OpenAPI specs...' },
  ];
  for (const { candidate, job, transcript } of interviewDefs) {
    const existing = await prisma.interview.findFirst({
      where: { orgId, jobId: job.id, candidateId: candidate.id },
    });
    if (!existing) {
      await prisma.interview.create({
        data: { orgId, jobId: job.id, candidateId: candidate.id, transcriptText: transcript },
      });
    }
  }
  console.log('  Interviews created for Alice and Bob');

  // ---------- Pending Evaluations → "Candidates Awaiting Evaluation" ----------
  const pendingDefs = [
    { candidate: carol, job: frontendJob },
    { candidate: david, job: backendJob  },
    { candidate: eva,   job: frontendJob },
  ];
  for (const { candidate, job } of pendingDefs) {
    await prisma.evaluation.upsert({
      where: { orgId_jobId_candidateId: { orgId, jobId: job.id, candidateId: candidate.id } },
      update: {},
      create: {
        orgId,
        jobId: job.id,
        candidateId: candidate.id,
        status: 'PENDING',
      },
    });
  }
  console.log('  Pending evaluations: Carol, David, Eva');

  // ---------- Completed Evaluations → "Recent Evaluations" + "Risk Alerts" ----------
  const completedDefs = [
    {
      candidate: alice,
      job: frontendJob,
      finalScore: 82,
      riskLevelJson: 'GREEN',
      riskLevelEnum: 'LOW' as const,
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      candidate: bob,
      job: backendJob,
      finalScore: 34,
      riskLevelJson: 'RED',
      riskLevelEnum: 'HIGH' as const,
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      candidate: carol,
      job: backendJob,
      finalScore: 61,
      riskLevelJson: 'YELLOW',
      riskLevelEnum: 'MEDIUM' as const,
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      candidate: david,
      job: frontendJob,
      finalScore: 28,
      riskLevelJson: 'RED',
      riskLevelEnum: 'HIGH' as const,
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      candidate: eva,
      job: backendJob,
      finalScore: 75,
      riskLevelJson: 'GREEN',
      riskLevelEnum: 'LOW' as const,
      completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      candidate: frank,
      job: frontendJob,
      finalScore: 55,
      riskLevelJson: 'YELLOW',
      riskLevelEnum: 'MEDIUM' as const,
      completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      candidate: grace,
      job: backendJob,
      finalScore: 48,
      riskLevelJson: 'YELLOW',
      riskLevelEnum: 'MEDIUM' as const,
      completedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
    },
    {
      candidate: henry,
      job: frontendJob,
      finalScore: 88,
      riskLevelJson: 'GREEN',
      riskLevelEnum: 'LOW' as const,
      completedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    },
    {
      candidate: iris,
      job: backendJob,
      finalScore: 91,
      riskLevelJson: 'GREEN',
      riskLevelEnum: 'LOW' as const,
      completedAt: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
    },
  ];

  for (const { candidate, job, finalScore, riskLevelJson, riskLevelEnum, completedAt } of completedDefs) {
    const finalScoreJson = {
      finalScore,
      riskLevel: riskLevelJson,
      summary: `Candidate scored ${finalScore}/100. Risk level: ${riskLevelJson}.`,
      flags: riskLevelEnum === 'HIGH'
        ? ['Inconsistent employment history', 'Skills mismatch', 'Unexplained gaps']
        : riskLevelEnum === 'MEDIUM'
        ? ['Minor experience gaps', 'Partial skills match']
        : [],
    };

    // Use a separate job for completed evals to avoid unique constraint conflict with pending ones
    // Only carol/david/eva have pending evals on specific jobs — completed use the other job
    await prisma.evaluation.upsert({
      where: { orgId_jobId_candidateId: { orgId, jobId: job.id, candidateId: candidate.id } },
      update: {
        status: 'COMPLETED',
        completedAt,
        finalScoreJson,
        riskLevel: riskLevelEnum,
        signalsJson: {
          strengths: [`Strong ${finalScore > 60 ? 'technical' : 'communication'} skills`],
          gaps: finalScore < 50 ? ['Missing key competencies'] : [],
          riskFlags: finalScoreJson.flags,
        },
      },
      create: {
        orgId,
        jobId: job.id,
        candidateId: candidate.id,
        status: 'COMPLETED',
        completedAt,
        finalScoreJson,
        riskLevel: riskLevelEnum,
        signalsJson: {
          strengths: [`Strong ${finalScore > 60 ? 'technical' : 'communication'} skills`],
          gaps: finalScore < 50 ? ['Missing key competencies'] : (finalScore < 70 ? ['Room for improvement'] : []),
          riskFlags: finalScoreJson.flags,
        },
      },
    });
  }
  console.log('  Completed evaluations: Alice (82/GREEN), Bob (34/RED), Carol (61/YELLOW), David (28/RED), Eva (75/GREEN), Frank (55/YELLOW), Grace (48/YELLOW), Henry (88/GREEN), Iris (91/GREEN)');
  console.log('  Risk Alerts will show: Bob, David (HIGH) · Carol, Frank, Grace (MEDIUM) · Alice, Eva, Henry, Iris (LOW)');

  // ---------- Collect completed evaluation IDs for activity seed ----------
  const completedEvals = await prisma.evaluation.findMany({
    where: { orgId, status: 'COMPLETED' },
    select: { id: true },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  await seedActivityData(orgId, actorUserId, jobs, candidates, completedEvals.map((e) => e.id));
}

async function main() {
  console.log('Start seeding...');

  // Create demo organization
  const existingOrg = await prisma.org.findFirst({
    where: { name: 'Demo Workspace' },
  });

  const demoOrg = existingOrg || await prisma.org.create({
    data: {
      name: 'Demo Workspace',
    },
  });

  // Create demo user
  const existingUser = await prisma.user.findFirst({
    where: { clerkUserId: 'demo_user_123' },
  });

  const demoUser = existingUser || await prisma.user.create({
    data: {
      clerkUserId: 'demo_user_123',
      email: 'demo@hireshield.com',
      name: 'Demo User',
    },
  });

  // Create org membership
  const existingMembership = await prisma.orgMember.findFirst({
    where: {
      orgId: demoOrg.id,
      userId: demoUser.id,
    },
  });

  await prisma.orgMember.upsert({
    where: {
      id: existingMembership?.id || '',
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      userId: demoUser.id,
      role: Role.OWNER,
    },
  });

  console.log('Seeding finished.');
  console.log(`Created org: ${demoOrg.name}`);
  console.log(`Created user: ${demoUser.email}`);
  console.log(`Created org membership for user: ${demoUser.email} in org: ${demoOrg.name}`);

  // ---------- Find the real provisioned org (from Clerk login) ----------
  // Look for orgs that have members but are NOT the Demo Workspace
  const realOrg = await prisma.org.findFirst({
    where: {
      name: { not: 'Demo Workspace' },
      members: { some: {} },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!realOrg) {
    console.log('\n⚠  No provisioned org found (you need to sign in to the app first).');
    console.log('   Sign in at http://localhost:3000/auth, then re-run: npm run seed');
    return;
  }

  console.log(`\nFound provisioned org: "${realOrg.name}" (id: ${realOrg.id})`);

  const firstMember = await prisma.orgMember.findFirst({
    where: { orgId: realOrg.id },
    select: { userId: true },
  });
  const actorUserId = firstMember?.userId ?? demoUser.id;

  await seedDashboardData(realOrg.id, actorUserId);

  console.log('\nDashboard test data seeded successfully!');
  console.log('Open http://localhost:3000/app to see the widgets.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
