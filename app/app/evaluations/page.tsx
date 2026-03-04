"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/ErrorState";

interface Evaluation {
  id: string;
  jobId: string;
  candidateId: string;
  job: { id: string; title: string };
  candidate: { id: string; fullName: string; email: string | null };
  createdAt: string;
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = async () => {
    try {
      setError(null);
      const response = await fetch("/api/evaluations", {
        headers: { "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" },
      });
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      } else {
        throw new Error("Failed to load evaluations");
      }
    } catch (e) {
      console.error(e);
      setError("Unable to load evaluations. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  if (error) {
    return (
      <ErrorState
        title="Unable to Load Evaluations"
        message={error}
        onRetry={fetchEvaluations}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Loading evaluations..." />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground font-display">Evaluations</h1>
      <p className="mt-1 text-muted-foreground font-body">
        All evaluations across jobs and candidates.
      </p>

      {evaluations.length === 0 && (
        <EmptyState
          title="No evaluations yet"
          message="Evaluations will appear here once you run them from a job or candidate."
        />
      )}

      {evaluations.length > 0 && (
        <div className="mt-6 rounded-button border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Candidate</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Job</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/evaluations/${ev.id}`}
                      className="text-primary hover:text-primary/90 font-body"
                    >
                      {ev.candidate?.fullName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-body">
                    <Link href={`/app/jobs/${ev.jobId}`} className="hover:text-foreground">
                      {ev.job?.title ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                    {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/evaluations/${ev.id}`}
                      className="text-sm text-primary hover:text-primary/90 font-body"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
