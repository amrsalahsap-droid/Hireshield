"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { orgFetchHeaders } from "@/lib/client/org-fetch-headers";

interface Candidate {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  rawCVText: string;
}

interface EditForm {
  fullName: string;
  email: string;
  phone: string;
  profileUrl: string;
  rawCVText: string;
}

interface Interview {
  id: string;
  jobId: string;
  job: {
    id: string;
    title: string;
  };
  transcriptText: string;
  createdAt: string;
}

interface Evaluation {
  id: string;
  jobId: string;
  job: {
    id: string;
    title: string;
  };
  signalsJson: any;
  finalScoreJson: any;
  createdAt: string;
}

export default function CandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: "",
    email: "",
    phone: "",
    profileUrl: "",
    rawCVText: "",
  });

  const startEditing = useCallback(() => {
    if (!candidate) return;
    setEditForm({
      fullName: candidate.fullName,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      profileUrl: candidate.profileUrl ?? "",
      rawCVText: candidate.rawCVText,
    });
    setEditing(true);
  }, [candidate]);

  const cancelEditing = () => setEditing(false);

  const saveCandidate = async () => {
    if (!candidate) return;
    const trimmedName = editForm.fullName.trim();
    if (!trimmedName) {
      toast.error("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...orgFetchHeaders() },
        body: JSON.stringify({
          fullName: editForm.fullName,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          profileUrl: editForm.profileUrl.trim() || null,
          rawCVText: editForm.rawCVText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update candidate.");
        return;
      }
      setCandidate(data.candidate);
      setEditing(false);
      toast.success("Candidate updated.");
    } catch {
      toast.error("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  };

  // Fetch candidate details
  const fetchCandidate = async () => {
    try {
      const response = await fetch(`/api/candidates/${params.id}`, {
        headers: {
          ...orgFetchHeaders(),
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCandidate(data.candidate);
      } else if (response.status === 404) {
        setError("Candidate not found");
      } else {
        throw new Error("Failed to load candidate details");
      }
    } catch (error) {
      console.error("Error fetching candidate:", error);
      setError("Unable to load candidate details. Please try again.");
    }
  };

  // Fetch interviews for this candidate
  const fetchInterviews = async () => {
    try {
      const response = await fetch(`/api/interviews?candidateId=${params.id}`, {
        headers: {
          ...orgFetchHeaders(),
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews || []);
      } else {
        console.error("Error fetching interviews");
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
    }
  };

  // Fetch evaluations for this candidate
  const fetchEvaluations = async () => {
    try {
      const response = await fetch(`/api/evaluations?candidateId=${params.id}`, {
        headers: {
          ...orgFetchHeaders(),
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      } else {
        console.error("Error fetching evaluations");
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchCandidate(), fetchInterviews(), fetchEvaluations()])
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (params.id) {
      refreshData();
    }
  }, [params.id]);

  // Loading state
  if (loading) {
    return <LoadingState message="Loading candidate details..." />;
  }

  // 404 error state
  if (error === "Candidate not found" || !candidate) {
    return (
      <ErrorState
        title="Candidate Not Found"
        message="The candidate you're looking for doesn't exist or has been removed."
        onBack={() => router.push("/app/candidates")}
        backText="Back to Candidates"
        icon="👤"
      />
    );
  }

  // General error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Candidate"
        message={error}
        onRetry={refreshData}
        onBack={() => router.push("/app/candidates")}
        backText="Back to Candidates"
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/app/candidates"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Candidates
            </Link>
            <div className="h-4 w-px bg-border"></div>
            <h1 className="text-2xl font-bold text-foreground font-display">{candidate.fullName}</h1>
          </div>
          <div className="flex items-center space-x-3">
            {editing ? (
              <>
                <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void saveCandidate()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <Button onClick={startEditing}>Edit Candidate</Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          {editing ? "Edit candidate details below." : "View candidate details and manage interview process."}
        </p>
      </div>

      {/* Candidate Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* CV Text */}
          <div className="bg-card shadow-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-medium text-foreground font-display">CV Text</h2>
              <span className="text-sm text-muted-foreground">
                {(editing ? editForm.rawCVText : candidate.rawCVText).length} characters
              </span>
            </div>
            <div className="px-6 py-4">
              {editing ? (
                <textarea
                  value={editForm.rawCVText}
                  onChange={(e) => setEditForm((f) => ({ ...f, rawCVText: e.target.value }))}
                  className="w-full min-h-[24rem] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                    {candidate.rawCVText}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Related Interviews & Evaluations */}
          <div className="bg-card shadow-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground font-display">Related Interviews & Evaluations</h2>
            </div>
            <div className="px-6 py-4">
              {interviews.length === 0 && evaluations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground text-4xl mb-3">📋</div>
                  <p className="text-muted-foreground mb-4">No interviews or evaluations yet</p>
                  <Link
                    href="/app/jobs"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
                  >
                    Create Interview
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Interviews */}
                  {interviews.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2">Interviews ({interviews.length})</h3>
                      <div className="space-y-2">
                        {interviews.map((interview) => (
                          <div key={interview.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div>
                              <div className="font-medium text-foreground">{interview.job.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(interview.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Link
                              href={`/app/interviews/${interview.id}`}
                              className="text-primary hover:text-primary/90 text-sm"
                            >
                              View Interview
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evaluations */}
                  {evaluations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2">Evaluations ({evaluations.length})</h3>
                      <div className="space-y-2">
                        {evaluations.map((evaluation) => (
                          <div key={evaluation.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div>
                              <div className="font-medium text-foreground">{evaluation.job.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(evaluation.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Link
                              href={`/app/evaluations/${evaluation.id}`}
                              className="text-primary hover:text-primary/90 text-sm"
                            >
                              View Evaluation
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Candidate Information */}
          <div className="bg-card shadow-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground font-display">Candidate Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-foreground">{candidate.fullName}</dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                {editing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-foreground">
                    {candidate.email || <span className="text-muted-foreground">—</span>}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                {editing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555 123 4567"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-foreground">
                    {candidate.phone || <span className="text-muted-foreground">—</span>}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Profile URL</dt>
                {editing ? (
                  <input
                    type="url"
                    value={editForm.profileUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, profileUrl: e.target.value }))}
                    placeholder="linkedin.com/in/…"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-foreground">
                    {candidate.profileUrl ? (
                      <a
                        href={candidate.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {candidate.profileUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(candidate.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(candidate.updatedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Candidate ID</dt>
                <dd className="mt-1 text-sm text-foreground font-mono">
                  {candidate.id}
                </dd>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card shadow-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground font-display">Quick Stats</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Interviews</span>
                <span className="text-sm font-medium text-foreground">{interviews.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Evaluations</span>
                <span className="text-sm font-medium text-foreground">{evaluations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Jobs Applied</span>
                <span className="text-sm font-medium text-foreground">
                  {new Set([...interviews.map(i => i.jobId), ...evaluations.map(e => e.jobId)]).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">CV Length</span>
                <span className="text-sm font-medium text-foreground">
                  {candidate.rawCVText.length.toLocaleString()} chars
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card shadow-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground font-display">Actions</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Button asChild className="w-full">
                <Link href="/app/jobs">Create Interview</Link>
              </Button>
              {!editing && (
                <Button variant="outline" className="w-full" onClick={startEditing}>
                  Edit Candidate
                </Button>
              )}
              <Button variant="destructive" className="w-full">
                Remove Candidate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
