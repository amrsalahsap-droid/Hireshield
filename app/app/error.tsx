"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground font-body mb-6">
          An unexpected error occurred. You can try again or return to the
          dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="destructive" onClick={reset}>
            Try Again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/app")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
