"use client";

import type { ReactNode } from "react";
import { ClientToaster } from "@/components/client-toaster";

type RootProvidersProps = {
  clerkPublishableKey: string | undefined;
  children: ReactNode;
};

/**
 * Root shell only: no ClerkProvider here — Clerk injects a script before its
 * children, which breaks hydration for global routes like `not-found`.
 * ClerkProvider lives under `app/auth/layout.tsx` and `app/app/layout.tsx`.
 */
export function RootProviders({
  clerkPublishableKey,
  children,
}: RootProvidersProps) {
  if (!clerkPublishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">HireShield</h1>
          <p className="text-lg text-muted-foreground mb-8">
            AI-powered hiring evaluation platform
          </p>
          <div className="text-sm text-muted-foreground">
            Please configure Clerk environment variables to enable authentication
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ClientToaster />
    </>
  );
}
