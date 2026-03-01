import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
