"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Mount Sonner after hydration so toast UI never participates in the initial
 * server/client HTML match (avoids edge-case hydration issues with Next + Clerk).
 */
export function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Toaster richColors position="top-center" />;
}
