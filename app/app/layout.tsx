import { currentUser } from "@clerk/nextjs/server";
import AppLayoutClient from "@/components/app/app-layout-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await currentUser();
  } catch (error) {
    console.error("Error getting current user:", error);
    user = null;
  }

  return <AppLayoutClient user={user}>{children}</AppLayoutClient>;
}
