"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  rawJD: string;
  jdExtractionJson: any;
  jdAnalyzedAt: string | null;
  jdPromptVersion: string | null;
  interviewKitJson: any;
  interviewKitGeneratedAt: string | null;
  interviewKitPromptVersion: string | null;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    rawJD: ""
  });
  const [errors, setErrors] = useState({
    title: "",
    rawJD: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setError(null);
      const response = await fetch("/api/jobs", {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        throw new Error("Failed to load jobs");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError("Unable to load jobs. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {
      title: "",
      rawJD: ""
    };

    if (!formData.title.trim()) {
      newErrors.title = "Job title is required";
    }

    if (!formData.rawJD.trim()) {
      newErrors.rawJD = "Job description is required";
    } else if (formData.rawJD.length > 10000) {
      newErrors.rawJD = "Job description must be less than 10,000 characters";
    }

    setErrors(newErrors);
    return !newErrors.title && !newErrors.rawJD;
  };

  // Handle job creation
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          rawJD: formData.rawJD.trim()
        })
      });

      if (response.ok) {
        // Reset form and close modal
        setFormData({ title: "", rawJD: "" });
        setShowCreateModal(false);
        setErrors({ title: "", rawJD: "" });
        
        // Refresh jobs list
        await fetchJobs();
      } else {
        const error = await response.json();
        console.error("Error creating job:", error);
        
        // Handle validation errors from server
        if (error.error && response.status === 400) {
          // Parse error message to set appropriate field errors
          if (error.error.includes("title")) {
            setErrors(prev => ({ ...prev, title: error.error }));
          } else if (error.error.includes("description") || error.error.includes("characters")) {
            setErrors(prev => ({ ...prev, rawJD: error.error }));
          } else {
            // Generic error
            setErrors({ title: error.error, rawJD: "" });
          }
        } else {
          throw new Error("Failed to create job");
        }
      }
    } catch (error) {
      console.error("Error creating job:", error);
      setError("Unable to create job. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "DRAFT": return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Jobs"
        message={error}
        onRetry={fetchJobs}
        onBack={() => window.location.href = "/app"}
        backText="Back to Dashboard"
      />
    );
  }

  // Loading state
  if (loading) {
    return <LoadingState message="Loading jobs..." />;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground font-display">Jobs</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Job
          </Button>
        </div>
        <p className="text-muted-foreground font-body">
          Manage your job postings and track applicant progress.
        </p>
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          message="Get started by creating your first job posting."
          action={{
            text: "Create Your First Job",
            onClick: () => setShowCreateModal(true)
          }}
          icon="💼"
        />
      )}

      {/* Jobs Table */}
      {jobs.length > 0 && (
        <div className="bg-card shadow-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    JD Analysis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Interview Kit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Created
                  </th>
                  <th className="relative px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground font-body">{job.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-body ${
                        job.status === "ACTIVE"
                          ? "bg-safe/10 text-safe"
                          : job.status === "DRAFT"
                            ? "bg-investigate/10 text-investigate"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-body">
                      {job.jdAnalyzedAt ? new Date(job.jdAnalyzedAt).toLocaleDateString() : "Not analyzed"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-body">
                      {job.interviewKitGeneratedAt ? new Date(job.interviewKitGeneratedAt).toLocaleDateString() : "Not generated"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-body">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/app/jobs/${job.id}`} className="text-primary hover:text-primary/90 font-body">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 pb-8">
          <div className="relative p-6 w-full max-w-md shadow-card rounded-xl border border-border bg-card">
            <h3 className="text-lg font-medium text-foreground font-display mb-4">
              Create New Job
            </h3>
            <form onSubmit={handleCreateJob}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                  placeholder="e.g. Senior Frontend Developer"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Job Description
                </label>
                <textarea
                  value={formData.rawJD}
                  onChange={(e) => setFormData({ ...formData, rawJD: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                  rows={6}
                  placeholder="Paste the complete job description here..."
                />
                <div className="mt-1 flex justify-between flex-wrap gap-1">
                  {errors.rawJD && (
                    <p className="text-sm text-destructive">{errors.rawJD}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    {formData.rawJD.length >= 8000 && formData.rawJD.length < 10000 && (
                      <p className="text-sm text-investigate">
                        Approaching limit
                      </p>
                    )}
                    {formData.rawJD.length >= 10000 && (
                      <p className="text-sm text-destructive">
                        Limit exceeded
                      </p>
                    )}
                    <p className={`text-sm font-body ${
                      formData.rawJD.length > 10000 ? "text-destructive" :
                      formData.rawJD.length >= 8000 ? "text-investigate" :
                      "text-muted-foreground"
                    }`}>
                      {formData.rawJD.length.toLocaleString()} / 10,000 characters
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ title: "", rawJD: "" });
                    setErrors({ title: "", rawJD: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
