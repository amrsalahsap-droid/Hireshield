import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      publishableKey={publishableKey}
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
    >
      {children}
    </ClerkProvider>
  );
}
