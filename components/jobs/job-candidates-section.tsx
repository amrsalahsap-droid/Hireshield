"use client";

import { useState } from "react";
import Link from "next/link";
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
];

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
    default: return "bg-muted text-muted-foreground";
  }
}

type Props = {
  jobId: string;
  jobStatus: string;
  assignments: JobAssignmentRow[];
  onAddCandidate: () => void;
  onRefresh: () => Promise<void>;
  onCreateInterview: (candidateId: string) => void;
  onCreateEvaluation: (candidateId: string) => void;
};

export function JobCandidatesSection({
  jobId,
  jobStatus,
  assignments,
  onAddCandidate,
  onRefresh,
  onCreateInterview,
  onCreateEvaluation,
}: Props) {
  const isActive = jobStatus === "ACTIVE";
  const [movingStage, setMovingStage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handleMoveStage = async (assignmentId: string, newStage: string) => {
    setBusy(assignmentId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({ assignmentId, stage: newStage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to move stage:", data.error ?? res.status);
      } else {
        await onRefresh();
      }
    } finally {
      setBusy(null);
      setMovingStage(null);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setBusy(assignmentId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to remove candidate:", data.error ?? res.status);
      } else {
        await onRefresh();
      }
    } finally {
      setBusy(null);
      setConfirmRemove(null);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-foreground font-display">
          Candidates for This Job ({assignments.length})
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
        {/* Empty state */}
        {assignments.length === 0 ? (
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
          /* Table */
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
                {assignments.map((row) => {
                  const isBusy = busy === row.id;
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
                            disabled={isBusy}
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
                              disabled={isBusy}
                              onClick={() => handleRemove(row.id)}
                              className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {isBusy ? "…" : "Yes"}
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
                              href={`/app/candidates/${row.candidate.id}`}
                              className="text-xs px-2 py-0.5 rounded border border-border text-indigo-600 hover:bg-muted transition-colors"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setMovingStage(row.id)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                            >
                              Move Stage
                            </button>
                            <button
                              type="button"
                              disabled={!isActive || isBusy}
                              title={!isActive ? "Job must be Active" : undefined}
                              onClick={() => onCreateInterview(row.candidate.id)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-blue-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Interview
                            </button>
                            <button
                              type="button"
                              disabled={!isActive || isBusy}
                              title={!isActive ? "Job must be Active" : undefined}
                              onClick={() => onCreateEvaluation(row.candidate.id)}
                              className="text-xs px-2 py-0.5 rounded border border-border text-purple-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Evaluate
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
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
