"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { orgFetchHeaders } from "@/lib/client/org-fetch-headers";

export interface JobAssignmentRow {
  id: string;
  stage: string;
  source?: string | null;
  addedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    createdAt?: string;
  };
}

function sourceLabel(source?: string | null): string {
  switch (source) {
    case "MANUAL": return "Manual";
    case "IMPORT": return "Import";
    case "REFERRAL": return "Referral";
    case "APPLIED": return "Applied";
    default: return "Manual";
  }
}

const ALL_STAGES: { value: string; label: string }[] = [
  { value: "ADDED", label: "Added" },
  { value: "AWAITING_INTERVIEW", label: "Awaiting Interview" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview Scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "EVALUATION_PENDING", label: "Evaluation Pending" },
  { value: "EVALUATED", label: "Evaluated" },
  { value: "DECISION_MADE", label: "Decision Made" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

const TERMINAL_STAGES = new Set(["HIRED", "REJECTED"]);

function stageLabel(stage: string): string {
  return ALL_STAGES.find((s) => s.value === stage)?.label ?? stage.replace(/_/g, " ");
}

function stageBadgeClass(stage: string): string {
  switch (stage) {
    case "ADDED": return "bg-slate-100 text-slate-700";
    case "AWAITING_INTERVIEW": return "bg-yellow-50 text-yellow-700";
    case "INTERVIEW_SCHEDULED": return "bg-blue-50 text-blue-700";
    case "INTERVIEW_COMPLETED": return "bg-blue-100 text-blue-800";
    case "EVALUATION_PENDING": return "bg-orange-50 text-orange-700";
    case "EVALUATED": return "bg-purple-50 text-purple-700";
    case "DECISION_MADE": return "bg-green-50 text-green-700";
    case "HIRED": return "bg-emerald-100 text-emerald-800";
    case "REJECTED": return "bg-red-50 text-red-700";
    default: return "bg-muted text-muted-foreground";
  }
}

interface LoadingState {
  stage: string | null;
  remove: string | null;
  interview: string | null;
  evaluation: string | null;
}

const IDLE: LoadingState = { stage: null, remove: null, interview: null, evaluation: null };

type Props = {
  jobId: string;
  jobStatus: string;
  assignments: JobAssignmentRow[];
  onAddCandidate: () => void;
  onCreateInterview: (candidateId: string, assignmentId: string) => void;
  onCreateEvaluation: (candidateId: string, assignmentId: string) => void;
};

export function JobCandidatesSection({
  jobId,
  jobStatus,
  assignments: propAssignments,
  onAddCandidate,
  onCreateInterview,
  onCreateEvaluation,
}: Props) {
  const isActive = jobStatus === "ACTIVE";

  const [rows, setRows] = useState<JobAssignmentRow[]>(propAssignments);
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!inflightRef.current) setRows(propAssignments);
  }, [propAssignments]);

  const [movingStage, setMovingStage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [ld, setLd] = useState<LoadingState>(IDLE);

  const isRowBusy = (id: string) =>
    ld.stage === id || ld.remove === id || ld.interview === id || ld.evaluation === id;

  // --- Move Stage (optimistic) ---
  const handleMoveStage = useCallback(
    async (assignmentId: string, newStage: string) => {
      const prev = rows;
      const row = rows.find((r) => r.id === assignmentId);
      if (!row || row.stage === newStage) {
        setMovingStage(null);
        return;
      }

      inflightRef.current = true;
      setRows((cur) => cur.map((r) => (r.id === assignmentId ? { ...r, stage: newStage } : r)));
      setLd((l) => ({ ...l, stage: assignmentId }));
      setMovingStage(null);

      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
          body: JSON.stringify({ assignmentId, stage: newStage }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setRows(prev);
          toast.error(data.error ?? "Failed to update stage");
        } else {
          toast.success(`Moved ${row.candidate.fullName} to ${stageLabel(newStage)}`);
        }
      } catch {
        setRows(prev);
        toast.error("Network error — stage change reverted");
      } finally {
        setLd((l) => ({ ...l, stage: null }));
        inflightRef.current = false;
      }
    },
    [rows, jobId],
  );

  // --- Remove (optimistic) ---
  const handleRemove = useCallback(
    async (assignmentId: string) => {
      const prev = rows;
      const row = rows.find((r) => r.id === assignmentId);
      if (!row) return;

      inflightRef.current = true;
      setRows((cur) => cur.filter((r) => r.id !== assignmentId));
      setLd((l) => ({ ...l, remove: assignmentId }));
      setConfirmRemove(null);

      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
          body: JSON.stringify({ assignmentId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setRows(prev);
          toast.error(data.error ?? "Failed to remove candidate");
        } else {
          toast.success(`${row.candidate.fullName} removed from job`);
        }
      } catch {
        setRows(prev);
        toast.error("Network error — removal reverted");
      } finally {
        setLd((l) => ({ ...l, remove: null }));
        inflightRef.current = false;
      }
    },
    [rows, jobId],
  );

  // --- Interview / Evaluation delegates ---
  const handleInterview = (row: JobAssignmentRow) => {
    setLd((l) => ({ ...l, interview: row.id }));
    onCreateInterview(row.candidate.id, row.id);
    setTimeout(() => setLd((l) => ({ ...l, interview: null })), 400);
  };

  const handleEvaluation = (row: JobAssignmentRow) => {
    setLd((l) => ({ ...l, evaluation: row.id }));
    onCreateEvaluation(row.candidate.id, row.id);
    setTimeout(() => setLd((l) => ({ ...l, evaluation: null })), 400);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-foreground font-display">
          Candidates for This Job ({rows.length})
        </h2>
        <button
          type="button"
          onClick={onAddCandidate}
          disabled={!isActive}
          title={!isActive ? "Job must be Active to add candidates" : undefined}
          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isActive
              ? "text-white bg-green-600 hover:bg-green-700"
              : "text-gray-400 bg-gray-200 cursor-not-allowed"
          }`}
        >
          + Add Candidate
        </button>
      </div>

      <div className="px-6 py-4">
        {rows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No candidates assigned to this job yet.
            </p>
            {isActive && (
              <button
                type="button"
                onClick={onAddCandidate}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                + Add Candidate
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Stage</th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Source</th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Added</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const busy = isRowBusy(row.id);
                  const isTerminal = TERMINAL_STAGES.has(row.stage);
                  const isConfirmingRemove = confirmRemove === row.id;
                  const isMovingThisStage = movingStage === row.id;

                  return (
                    <tr key={row.id} className="group">
                      {/* Name */}
                      <td className="py-3 pr-4">
                        <div className="font-medium text-foreground">{row.candidate.fullName}</div>
                        {row.candidate.email && (
                          <div className="text-xs text-muted-foreground">{row.candidate.email}</div>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-3 pr-4">
                        {isMovingThisStage ? (
                          <select
                            defaultValue={row.stage}
                            disabled={busy}
                            autoFocus
                            onBlur={() => setMovingStage(null)}
                            onChange={(e) => handleMoveStage(row.id, e.target.value)}
                            className="text-xs border border-border rounded px-1 py-0.5 bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {ALL_STAGES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageBadgeClass(row.stage)}`}
                          >
                            {stageLabel(row.stage)}
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{sourceLabel(row.source)}</td>

                      {/* Added */}
                      <td className="py-3 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3">
                        {isConfirmingRemove ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-muted-foreground mr-1">Remove?</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemove(row.id)}
                              className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {busy ? "…" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(null)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <Link
                              href={`/app/candidates/${row.candidate.id}?jobId=${jobId}`}
                              className="text-xs px-2 py-0.5 rounded border border-border text-indigo-600 hover:bg-muted transition-colors"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setMovingStage(row.id)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                            >
                              Move Stage
                            </button>
                            <button
                              type="button"
                              disabled={!isActive || busy || isTerminal}
                              title={isTerminal ? "Candidate is in a terminal stage" : !isActive ? "Job must be Active" : undefined}
                              onClick={() => handleInterview(row)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-blue-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Interview
                            </button>
                            <button
                              type="button"
                              disabled={!isActive || busy || isTerminal}
                              title={isTerminal ? "Candidate is in a terminal stage" : !isActive ? "Job must be Active" : undefined}
                              onClick={() => handleEvaluation(row)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-purple-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Evaluate
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmRemove(row.id)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-red-500 hover:bg-muted disabled:opacity-50 transition-colors"
                            >
                              Remove
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
