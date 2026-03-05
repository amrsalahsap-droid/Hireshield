import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class NoSessionError extends Error {
  constructor() {
    super("No session");
    this.name = "NoSessionError";
  }
}

export interface AuthUser {
  userId: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  orgId: string;
}

export async function getCurrentUserOrThrow() {
  const { userId } = await auth();

  if (!userId) {
    throw new NoSessionError();
  }

  const clerkUser = await (await import("@clerk/nextjs/server")).currentUser();
  
  if (!clerkUser) {
    throw new Error("Unauthorized: Clerk user not found");
  }

  const primaryEmail = clerkUser.emailAddresses.find(
    (email: { id: string; emailAddress: string }) => email.id === clerkUser.primaryEmailAddressId
  );
  const emailAddress = primaryEmail?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!emailAddress) {
    throw new Error("Unauthorized: No email found");
  }

  return {
    clerkUserId: userId,
    email: emailAddress as string,
    name: clerkUser.firstName 
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : null,
  };
}

/** Shared provisioning: find or create User and Org from Clerk identity. */
export async function ensureProvisionedFromClerkData(
  clerkUserId: string,
  email: string,
  name: string | null
): Promise<AuthUser> {
  let dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { orgMemberships: { include: { org: true } } },
  });

  if (!dbUser) {
    // Create new user and personal org
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          clerkUserId,
          email,
          name,
        },
      });

      // Create personal org
      const orgName = name ? `${name.split(' ')[0]} Workspace` : "My Workspace";
      const newOrg = await tx.org.create({
        data: {
          name: orgName,
        },
      });

      // Create org membership with OWNER role
      await tx.orgMember.create({
        data: {
          orgId: newOrg.id,
          userId: newUser.id,
          role: Role.OWNER,
        },
      });

      return { user: newUser, org: newOrg };
    });

    dbUser = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { orgMemberships: { include: { org: true } } },
    });

    console.log(`Provisioned new user: ${dbUser?.id}, org: ${result.org.id}`);
  }

  if (dbUser && (!dbUser.orgMemberships || dbUser.orgMemberships.length === 0)) {
    const userToProvision = dbUser;
    const result = await prisma.$transaction(async (tx) => {
      const orgName = userToProvision.name ? `${userToProvision.name.split(' ')[0]} Workspace` : "My Workspace";
      const newOrg = await tx.org.create({
        data: { name: orgName },
      });

      await tx.orgMember.create({
        data: {
          orgId: newOrg.id,
          userId: userToProvision.id,
          role: Role.OWNER,
        },
      });

      return { org: newOrg };
    });

    dbUser = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { orgMemberships: { include: { org: true } } },
    });

    console.log(`Provisioned org for existing user: ${dbUser?.id}, org: ${result.org.id}`);
  }

  if (!dbUser || !dbUser.orgMemberships?.[0]) {
    throw new Error("Failed to provision user organization");
  }

  return {
    userId: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    orgId: dbUser.orgMemberships[0].orgId,
  };
}

/** Fast-path lookup when user is already provisioned in DB. */
export async function getProvisionedUserByClerkId(
  clerkUserId: string
): Promise<AuthUser | null> {
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { orgMemberships: { include: { org: true } } },
  });

  if (!dbUser || !dbUser.orgMemberships?.[0]) {
    return null;
  }

  return {
    userId: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    orgId: dbUser.orgMemberships[0].orgId,
  };
}

export async function ensureProvisioned(): Promise<AuthUser> {
  const { clerkUserId, email, name } = await getCurrentUserOrThrow();
  return ensureProvisionedFromClerkData(clerkUserId, email, name);
}

export async function requireAuthAndOrg(): Promise<AuthUser> {
  try {
    return await ensureProvisioned();
  } catch (error) {
    console.error("Auth error:", error);
    throw new Error("Unauthorized");
  }
}
