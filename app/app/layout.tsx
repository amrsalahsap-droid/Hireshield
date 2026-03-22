import { currentUser } from "@clerk/nextjs/server";
import AppLayoutClient from "@/components/app/app-layout-client";

type ClientUser = {
  id: string;
  fullName: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
};

function toClientUser(
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>
): ClientUser {
  const primary = clerkUser.primaryEmailAddress;
  return {
    id: clerkUser.id,
    fullName: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
    primaryEmailAddress: primary
      ? { emailAddress: primary.emailAddress }
      : null,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: ClientUser | null = null;
  try {
    const clerkUser = await currentUser();
    if (clerkUser) {
      user = toClientUser(clerkUser);
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    user = null;
  }

  return <AppLayoutClient user={user}>{children}</AppLayoutClient>;
}
