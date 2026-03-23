"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { orgFetchHeaders } from "@/lib/client/org-fetch-headers";
import {
  parseAndValidateCandidateCreate,
  identityRequirementMessage,
  MIN_CV_IDENTITY_LENGTH,
} from "@/lib/candidate-profile";
import type { JobAssignmentRow } from "@/components/jobs/job-candidates-section";

export type CandidateListItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  profileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  source: string | null;
};

type Tab = "existing" | "new";

type FieldKey =
  | "fullName"
  | "email"
  | "phone"
  | "profileUrl"
  | "rawCVText"
  | "source";

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  assignedIds: Set<string>;
  onAssigned: (payload: { assignment: JobAssignmentRow }) => void | Promise<void>;
};

const ASSIGNMENT_SOURCES = ["MANUAL", "IMPORT", "REFERRAL", "APPLIED"] as const;

function sourceLabel(source?: string | null): string {
  switch (source) {
    case "MANUAL":
      return "Manual";
    case "IMPORT":
      return "Import";
    case "REFERRAL":
      return "Referral";
    case "APPLIED":
      return "Applied";
    default:
      return "—";
  }
}

type DupMatch = {
  id: string;
  fullName: string;
  email: string | null;
  matchType: "email" | "name";
};

export function AddCandidateToJobModal({
  open,
  onClose,
  jobId,
  assignedIds,
  onAssigned,
}: Props) {
  const [tab, setTab] = useState<Tab>("existing");
  const [allCandidates, setAllCandidates] = useState<CandidateListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newSource, setNewSource] = useState<(typeof ASSIGNMENT_SOURCES)[number]>("MANUAL");

  const [duplicateMatches, setDuplicateMatches] = useState<DupMatch[] | null>(null);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    setTab("existing");
    setSearch("");
    setSelectedId("");
    setError(null);
    setFieldErrors({});
    setDuplicateMatches(null);
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewProfileUrl("");
    setNewNotes("");
    setNewSource("MANUAL");
    setLoadingList(true);
    void fetch("/api/candidates?limit=100", { headers: { ...orgFetchHeaders() } })
      .then((r) => r.json())
      .then((d: { candidates?: CandidateListItem[] }) => {
        setAllCandidates(
          (d.candidates ?? []).map((c) => ({
            ...c,
            source: c.source ?? null,
            createdAt: c.createdAt ?? "",
            updatedAt: c.updatedAt ?? c.createdAt ?? "",
          }))
        );
      })
      .catch(() => setAllCandidates([]))
      .finally(() => setLoadingList(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCandidates;
    const tokens = q.split(/\s+/).filter(Boolean);
    return allCandidates.filter((c) =>
      tokens.every(
        (t) =>
          c.fullName.toLowerCase().includes(t) ||
          (c.email && c.email.toLowerCase().includes(t))
      )
    );
  }, [allCandidates, search]);

  function buildCreateBody(forceCreate?: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      fullName: newFullName,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      profileUrl: newProfileUrl.trim() || undefined,
      rawCVText: newNotes.trim(),
      source: newSource,
    };
    if (forceCreate) body.forceCreate = true;
    return body;
  }

  const assignExistingById = async (candidateId: string) => {
    if (!candidateId) {
      setError("Select a candidate.");
      return;
    }
    if (assignedIds.has(candidateId)) {
      toast.error("This candidate is already assigned to this job.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({ candidateId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        assignment?: JobAssignmentRow;
      };
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Could not assign candidate.";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!data.assignment) {
        toast.error("Unexpected response from server.");
        return;
      }
      toast.success(
        `${data.assignment.candidate?.fullName ?? "Candidate"} added to this job.`
      );
      await onAssigned({ assignment: data.assignment });
      setDuplicateMatches(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const submitExisting = async () => {
    await assignExistingById(selectedId);
  };

  const submitNew = async (forceCreate?: boolean) => {
    setError(null);
    const body = buildCreateBody(forceCreate);
    const parsed = parseAndValidateCandidateCreate(body);
    if (!parsed.ok) {
      setFieldErrors(
        parsed.field ? { [parsed.field]: parsed.error } : { rawCVText: parsed.error }
      );
      if (parsed.field === "rawCVText" || !parsed.field) {
        setError(parsed.error);
      }
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
        code?: string;
        matches?: DupMatch[];
        candidate?: { fullName?: string };
        assignment?: JobAssignmentRow;
      };

      if (res.status === 422 && data.code === "POSSIBLE_DUPLICATE" && data.matches?.length) {
        setDuplicateMatches(data.matches);
        toast.message("Possible duplicate — review below.");
        return;
      }

      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Could not create candidate.";
        if (data.field && typeof data.field === "string") {
          setFieldErrors({ [data.field as FieldKey]: msg });
        }
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!data.assignment) {
        toast.error("Unexpected response from server.");
        return;
      }

      toast.success(
        `${data.candidate?.fullName ?? "Candidate"} created and assigned to this job.`
      );
      setDuplicateMatches(null);
      await onAssigned({ assignment: data.assignment });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const showDupWarning = tab === "new" && duplicateMatches && duplicateMatches.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-candidate-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <h2 id="add-candidate-modal-title" className="text-lg font-semibold text-foreground">
            Add candidate to job
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-5 pt-3">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setTab("existing");
                setError(null);
                setFieldErrors({});
                setDuplicateMatches(null);
              }}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                tab === "existing"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Existing candidates
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("new");
                setError(null);
                setFieldErrors({});
              }}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                tab === "new"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New candidate
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "existing" ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground" htmlFor="candidate-search">
                Search
              </label>
              <input
                id="candidate-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email (all words must match)…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                Select one candidate. Already assigned people are marked and cannot be selected again.
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                {loadingList ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading candidates…</p>
                ) : filtered.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No candidates match your search.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((c) => {
                      const assigned = assignedIds.has(c.id);
                      const selected = selectedId === c.id;
                      const updated = c.updatedAt || c.createdAt;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            disabled={assigned}
                            onClick={() => {
                              if (!assigned) setSelectedId(c.id);
                            }}
                            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                              assigned
                                ? "cursor-not-allowed bg-muted/50 text-muted-foreground"
                                : selected
                                  ? "bg-primary/10 text-foreground"
                                  : "hover:bg-muted/80"
                            }`}
                          >
                            <span
                              className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input"
                              aria-hidden
                            >
                              {selected && !assigned ? (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">{c.fullName}</span>
                              <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                {c.email ? <span className="truncate">{c.email}</span> : <span>No email</span>}
                                <span className="text-border">·</span>
                                <span>Source: {sourceLabel(c.source)}</span>
                                <span className="text-border">·</span>
                                <span>
                                  Updated{" "}
                                  {updated
                                    ? new Date(updated).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "—"}
                                </span>
                              </span>
                              {assigned ? (
                                <span className="mt-1 block text-xs font-medium text-amber-800">
                                  Already on this job
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : showDupWarning ? (
            <div className="space-y-4">
              <div
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                role="alert"
              >
                <p className="font-medium">Possible duplicate</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                  We found existing profiles that may match. Assign one of them to avoid duplicates, or
                  create a new record if you are sure.
                </p>
              </div>
              <ul className="space-y-2">
                {duplicateMatches!.map((m) => {
                  const onJob = assignedIds.has(m.id);
                  return (
                    <li
                      key={`${m.id}-${m.matchType}`}
                      className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium text-foreground">{m.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.email ?? "No email"} · Match: {m.matchType === "email" ? "same email" : "same name"}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={submitting || onJob}
                        onClick={() => void assignExistingById(m.id)}
                        className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {onJob ? "Already on job" : "Assign this candidate"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitNew(true)}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Create new anyway
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setDuplicateMatches(null);
                    setError(null);
                  }}
                  className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to form
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Full name and resume/CV text are required. {identityRequirementMessage()}
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-name">
                  Full name *
                </label>
                <input
                  id="new-candidate-name"
                  value={newFullName}
                  onChange={(e) => {
                    setNewFullName(e.target.value);
                    clearFieldError("fullName");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Jane Doe"
                />
                {fieldErrors.fullName ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-email">
                  Email
                </label>
                <input
                  id="new-candidate-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="name@company.com"
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-phone">
                  Phone
                </label>
                <input
                  id="new-candidate-phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="+1 555 123 4567"
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                ) : null}
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-foreground"
                  htmlFor="new-candidate-profile"
                >
                  LinkedIn / profile URL
                </label>
                <input
                  id="new-candidate-profile"
                  type="url"
                  value={newProfileUrl}
                  onChange={(e) => {
                    setNewProfileUrl(e.target.value);
                    clearFieldError("profileUrl");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://linkedin.com/in/…"
                />
                {fieldErrors.profileUrl ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.profileUrl}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-source">
                  Assignment source
                </label>
                <select
                  id="new-candidate-source"
                  value={newSource}
                  onChange={(e) =>
                    setNewSource(e.target.value as (typeof ASSIGNMENT_SOURCES)[number])
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ASSIGNMENT_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {sourceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-notes">
                  Resume / CV text *
                </label>
                <textarea
                  id="new-candidate-notes"
                  value={newNotes}
                  onChange={(e) => {
                    setNewNotes(e.target.value);
                    clearFieldError("rawCVText");
                  }}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={`Paste resume or CV (${MIN_CV_IDENTITY_LENGTH}+ characters required)`}
                />
                {fieldErrors.rawCVText ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.rawCVText}</p>
                ) : null}
              </div>
            </div>
          )}

          {error && !fieldErrors.rawCVText ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          {tab === "existing" ? (
            <button
              type="button"
              onClick={() => void submitExisting()}
              disabled={submitting || !selectedId || assignedIds.has(selectedId)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add to job"}
            </button>
          ) : showDupWarning ? null : (
            <button
              type="button"
              onClick={() => void submitNew(false)}
              disabled={submitting || !newFullName.trim()}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create and assign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
