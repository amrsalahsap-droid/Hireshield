"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { orgFetchHeaders } from "@/lib/client/org-fetch-headers";

export type CandidateListItem = { id: string; fullName: string; email: string | null };

type Tab = "existing" | "new";

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  assignedIds: Set<string>;
  onAssigned: () => void | Promise<void>;
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

  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("existing");
    setSearch("");
    setSelectedId("");
    setError(null);
    setNewFullName("");
    setNewEmail("");
    setNewNotes("");
    setLoadingList(true);
    void fetch("/api/candidates?limit=100", { headers: { ...orgFetchHeaders() } })
      .then((r) => r.json())
      .then((d: { candidates?: CandidateListItem[] }) => setAllCandidates(d.candidates ?? []))
      .catch(() => setAllCandidates([]))
      .finally(() => setLoadingList(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCandidates;
    return allCandidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [allCandidates, search]);

  const submitExisting = async () => {
    if (!selectedId) {
      setError("Select a candidate.");
      return;
    }
    if (assignedIds.has(selectedId)) {
      setError("This candidate is already assigned to this job.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({ candidateId: selectedId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        assignment?: { candidate?: { fullName?: string } };
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not assign candidate.");
        return;
      }
      toast.success(
        `${data.assignment?.candidate?.fullName ?? "Candidate"} added to this job.`
      );
      await onAssigned();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const submitNew = async () => {
    const name = newFullName.trim();
    if (!name) {
      setError("Full name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({
          fullName: name,
          email: newEmail.trim() || undefined,
          rawCVText: newNotes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        candidate?: { fullName?: string };
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create candidate.");
        return;
      }
      toast.success(
        `${data.candidate?.fullName ?? "Candidate"} created and assigned to this job.`
      );
      await onAssigned();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-candidate-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
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
                placeholder="Name or email…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                Select one candidate. Already assigned people are marked and cannot be selected again.
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                {loadingList ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading candidates…</p>
                ) : filtered.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No candidates match your search.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((c) => {
                      const assigned = assignedIds.has(c.id);
                      const selected = selectedId === c.id;
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
                              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input"
                              aria-hidden
                            >
                              {selected && !assigned ? (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">{c.fullName}</span>
                              {c.email ? (
                                <span className="block truncate text-muted-foreground">{c.email}</span>
                              ) : null}
                              {assigned ? (
                                <span className="mt-0.5 block text-xs font-medium text-amber-800">
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create a minimal profile and assign to this job in one step.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-name">
                  Full name *
                </label>
                <input
                  id="new-candidate-name"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-email">
                  Email
                </label>
                <input
                  id="new-candidate-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="new-candidate-notes">
                  Notes / CV excerpt
                </label>
                <textarea
                  id="new-candidate-notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Optional short notes or pasted resume snippet"
                />
              </div>
            </div>
          )}

          {error ? (
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
          ) : (
            <button
              type="button"
              onClick={() => void submitNew()}
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
