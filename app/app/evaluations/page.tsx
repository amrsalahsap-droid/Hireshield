"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/ErrorState";
import { RiskBadge } from "@/components/ui/risk-badge";

interface Evaluation {
  id: string;
  jobId: string;
  candidateId: string;
  job: { id: string; title: string };
  candidate: { id: string; fullName: string; email: string | null };
  createdAt: string;
}

interface RecentEvaluation {
  id: string;
  jobId: string;
  candidateId: string;
  job: { id: string; title: string };
  candidate: { id: string; fullName: string; email: string | null };
  score: number;
  riskLevel: "GREEN" | "YELLOW" | "RED";
  completedAt: string;
}

function toRiskBadge(riskLevel: RecentEvaluation["riskLevel"]) {
  if (riskLevel === "GREEN") return { level: "safe" as const, label: "Low" };
  if (riskLevel === "YELLOW") return { level: "investigate" as const, label: "Medium" };
  return { level: "high" as const, label: "High" };
}

export default function EvaluationsPage() {
  const router = useRouter();
  const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluation[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = async () => {
    try {
      setError(null);
      const headers = { "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" };
      const [allResponse, recentResponse] = await Promise.all([
        fetch("/api/evaluations", { headers }),
        fetch("/api/evaluations?recentCompleted=1", { headers }),
      ]);

      if (!allResponse.ok || !recentResponse.ok) {
        throw new Error("Failed to load evaluations");
      }

      const [allData, recentData] = await Promise.all([
        allResponse.json(),
        recentResponse.json(),
      ]);
      setEvaluations(allData.evaluations || []);
      setRecentEvaluations(recentData.evaluations || []);
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

      <div className="mt-6 rounded-button border border-border bg-card overflow-hidden">
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-lg font-medium text-foreground font-display">Recent Evaluations</h2>
        </div>
        {recentEvaluations.length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-muted-foreground font-body text-sm">No completed evaluations yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                  Candidate
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                  Job
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                  Score
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                  Risk
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                  Evaluated At
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentEvaluations.map((ev) => {
                const risk = toRiskBadge(ev.riskLevel);
                return (
                  <tr key={ev.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/evaluations/${ev.id}`}
                        className="text-primary hover:text-primary/90 font-body"
                      >
                        {ev.candidate?.fullName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                      {ev.job?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-body text-sm">{ev.score}</td>
                    <td className="px-4 py-3">
                      <RiskBadge level={risk.level} label={risk.label} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                      {new Date(ev.completedAt).toLocaleString()}
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {evaluations.length === 0 && (
        <EmptyState
          title="No evaluations yet"
          message="Start evaluating candidates to see assessment results and risk analysis here."
          action={{
            text: "View Candidates",
            onClick: () => router.push("/app/candidates")
          }}
          icon="📋"
          size="lg"
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
