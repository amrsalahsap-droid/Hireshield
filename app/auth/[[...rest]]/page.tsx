import AuthPageClient from './AuthPageClient';

export const dynamic = 'force-dynamic';

export default function AuthPage() {
  // Check if Clerk is available on server side
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkAvailable = !!clerkKey && clerkKey.startsWith('pk_');

  return <AuthPageClient clerkAvailable={clerkAvailable} />;
}
