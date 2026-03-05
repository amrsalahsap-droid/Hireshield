"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import type {
  AwaitingEvaluationRow,
  DashboardJobRow,
  DashboardSummary,
} from "@/lib/server/dashboard";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "done") return "text-safe";
  if (s === "running") return "text-investigate";
  if (s === "failed") return "text-destructive";
  return "text-muted-foreground";
}

type DiagStep = string;

export default function AppPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagStep, setDiagStep] = useState<DiagStep | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setDiagStep("not-signed-in");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) {
            setDiagStep("no-token");
            setLoading(false);
          }
          return;
        }
        const res = await fetch("/api/dashboard", {
          credentials: "omit",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          setDiagStep(`api-401:${body?.reason ?? "unknown"}` as DiagStep);
          setSummary(null);
          return;
        }
        if (res.status === 503) {
          const body = await res.json().catch(() => ({}));
          setDiagStep(`api-503:${body?.reason ?? "unknown"}` as DiagStep);
          setSummary(null);
          return;
        }
        if (!res.ok) {
          setDiagStep("api-error");
          throw new Error("Failed to load dashboard");
        }
        const data = await res.json();
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
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

  if (diagStep || !summary) {
    const diagMessages: Record<string, string> = {
      "not-signed-in": "Clerk loaded but you are not signed in.",
      "no-token": "You are signed in but Clerk returned no session token.",
      "api-error": "Server returned an unexpected error.",
      "clerk-not-loaded": "Clerk has not loaded.",
    };
    const diagMessage =
      diagStep && diagStep.startsWith("api-401:")
        ? `Token rejected by server. Clerk reason: ${diagStep.slice(8)}`
        : diagStep && diagStep.startsWith("api-503:")
          ? `Database temporarily unreachable. Reason: ${diagStep.slice(8)}`
        : (diagMessages[diagStep ?? ""] ?? diagStep);
    const diagTitle =
      diagStep && diagStep.startsWith("api-503:")
        ? "Dashboard temporarily unavailable"
        : "Session verification failed";
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center max-w-md mx-auto space-y-4">
          <p className="font-body text-foreground font-semibold">
            {diagTitle}
          </p>
          {diagStep && (
            <p className="font-mono text-xs bg-muted border border-border rounded px-3 py-2 text-left text-foreground">
              Step: <span className="font-bold">{diagStep}</span>
              <br />
              {diagMessage}
            </p>
          )}
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 font-body"
          >
            Sign in again
          </Link>
        </div>
      </div>
    );
  }

  const { activeCount, draftCount, archivedCount, recentJobs, candidatesAwaitingEvaluation } =
    summary;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">Overview</h1>
        <p className="text-muted-foreground font-body">
          High-level view of hiring activity and readiness. Click a job to open its details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💼</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground font-body truncate">Active jobs</dt>
                  <dd className="text-lg font-semibold text-foreground font-display">{activeCount}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 h-2 bg-primary rounded-full" />
          </div>
        </div>
        <div className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground font-body truncate">Draft jobs</dt>
                  <dd className="text-lg font-semibold text-foreground font-display">{draftCount}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 h-2 bg-investigate rounded-full" />
          </div>
        </div>
        <div className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground font-body truncate">Archived jobs</dt>
                  <dd className="text-lg font-semibold text-foreground font-display">{archivedCount}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full" />
          </div>
        </div>
      </div>

      <div className="bg-card shadow-card rounded-xl border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-foreground font-display mb-4">
            Recently active jobs
          </h3>

          {recentJobs.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">No jobs yet. Create one from Jobs.</p>
          ) : (
            <div className="rounded-button border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Job title</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Seniority</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Candidates</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">JD analysis</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">Interview kit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentJobs.map((job: DashboardJobRow) => (
                    <tr key={job.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={job.href}
                          className="font-medium text-foreground font-body text-primary hover:text-primary/90"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">{job.seniority}</td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">{job.candidateCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-body ${statusBadge(job.jdAnalysisStatus)}`}>
                          {job.jdAnalysisStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-body ${statusBadge(job.interviewKitStatus)}`}>
                          {job.interviewKitStatus.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card shadow-card rounded-xl border border-border mt-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-foreground font-display mb-4">
            Candidates Awaiting Evaluation
          </h3>

          {candidatesAwaitingEvaluation.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">
              No pending evaluations right now.
            </p>
          ) : (
            <div className="rounded-button border border-border overflow-hidden">
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
                      Stage
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                      Transcript
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground font-display">
                      Evaluation Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidatesAwaitingEvaluation.map((item: AwaitingEvaluationRow) => (
                    <tr key={item.evaluationId} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={item.href}
                          className="font-medium text-foreground font-body text-primary hover:text-primary/90"
                        >
                          {item.candidateName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                        {item.jobTitle}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                        {item.stage}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                        {item.hasTranscript ? "Available" : "Missing"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body text-sm">
                        {item.evaluationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
