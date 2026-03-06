"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type UsageData = {
  org: { id: string; name: string; createdAt: string };
  usage: {
    jdAnalysisCount: number;
    interviewKitCount: number;
    evaluationsCompleted: number;
  };
};

export default function BillingPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/auth");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) {
            setError("No session token available.");
            setLoading(false);
          }
          return;
        }
        const res = await fetch("/api/usage", {
          credentials: "omit",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          setError("Failed to load usage data.");
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Failed to load usage data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <p className="text-muted-foreground font-body">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <p className="text-destructive font-body text-sm">{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const stats = [
    { label: "JD Analyses", value: data.usage.jdAnalysisCount },
    { label: "Interview Kits", value: data.usage.interviewKitCount },
    { label: "Evaluations Completed", value: data.usage.evaluationsCompleted },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">Billing</h1>
        <p className="text-muted-foreground font-body">
          Manage your subscription and billing details.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium text-foreground font-display mb-1">AI Usage</h2>
        <p className="text-sm text-muted-foreground font-body mb-4">
          Cumulative usage across your organization.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted-foreground font-body truncate">{label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground font-display">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
