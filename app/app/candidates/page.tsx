"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";

interface Candidate {
  id: string;
  fullName: string;
  email: string | null;
  createdAt: string;
  rawCVText: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    rawCVText: ""
  });
  const [errors, setErrors] = useState({
    fullName: "",
    rawCVText: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch candidates from API
  const fetchCandidates = async () => {
    try {
      setError(null);
      const response = await fetch("/api/candidates", {
        headers: {
          "x-org-id": "cmmk1zo40000212ymhwgz0di8" // Demo org ID
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      } else {
        throw new Error("Failed to load candidates");
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setError("Unable to load candidates. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
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
      fullName: "",
      rawCVText: ""
    };

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Candidate name is required";
    }

    if (!formData.rawCVText.trim()) {
      newErrors.rawCVText = "CV text is required";
    } else if (formData.rawCVText.length > 20000) {
      newErrors.rawCVText = "CV text must be less than 20,000 characters";
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.rawCVText;
  };

  // Handle candidate creation
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": "cmmk1zo40000212ymhwgz0di8" // Demo org ID
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || null,
          rawCVText: formData.rawCVText.trim()
        })
      });

      if (response.ok) {
        // Reset form and close modal
        setFormData({ fullName: "", email: "", rawCVText: "" });
        setShowCreateModal(false);
        setErrors({ fullName: "", rawCVText: "" });
        
        // Refresh candidates list
        await fetchCandidates();
      } else {
        const error = await response.json();
        console.error("Error creating candidate:", error);
        
        // Handle validation errors from server
        if (error.error && response.status === 400) {
          // Parse error message to set appropriate field errors
          if (error.error.includes("name")) {
            setErrors(prev => ({ ...prev, fullName: error.error }));
          } else if (error.error.includes("CV") || error.error.includes("characters")) {
            setErrors(prev => ({ ...prev, rawCVText: error.error }));
          } else if (error.error.includes("email")) {
            // Email is optional, so show as a general error
            setErrors(prev => ({ ...prev, fullName: error.error }));
          } else {
            // Generic error
            setErrors({ fullName: error.error, rawCVText: "" });
          }
        } else {
          throw new Error("Failed to create candidate");
        }
      }
    } catch (error) {
      console.error("Error creating candidate:", error);
      setError("Unable to create candidate. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-safe/10 text-safe";
      case "Screening": return "bg-primary/10 text-primary";
      case "New": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Candidates"
        message={error}
        onRetry={fetchCandidates}
        onBack={() => window.location.href = "/app"}
        backText="Back to Dashboard"
      />
    );
  }

  // Loading state
  if (loading) {
    return <LoadingState message="Loading candidates..." />;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground font-display">Candidates</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            Add Candidate
          </Button>
        </div>
        <p className="text-muted-foreground font-body">
          Track and manage your candidate pipeline.
        </p>
      </div>

      {/* Empty State */}
      {candidates.length === 0 && (
        <EmptyState
          title="No candidates yet"
          message="Get started by adding your first candidate."
          action={{
            text: "Add Your First Candidate",
            onClick: () => setShowCreateModal(true)
          }}
          icon="👥"
        />
      )}

      {/* Candidates Grid */}
      {candidates.length > 0 && (
        <div className="bg-card shadow-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Added
                  </th>
                  <th className="relative px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                            <span className="text-lg font-medium text-foreground font-body">
                              {candidate.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground font-body">
                            {candidate.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground font-body">
                            {candidate.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-body ${getStatusColor("New")}`}>
                        New
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-body">
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/app/candidates/${candidate.id}`}
                        className="text-primary hover:text-primary/90 mr-3 font-body"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Candidate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10 pb-8">
          <div className="relative p-6 w-full max-w-2xl shadow-card rounded-xl border border-border bg-card">
            <h3 className="text-lg font-medium text-foreground font-display mb-4">
              Add New Candidate
            </h3>

            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground font-body mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body ${
                    errors.fullName ? "border-destructive" : "border-input"
                  }`}
                  placeholder="e.g. John Doe"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground font-body mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                  placeholder="e.g. john.doe@example.com"
                />
              </div>

              <div>
                <label htmlFor="rawCVText" className="block text-sm font-medium text-foreground font-body mb-1">
                  CV Text *
                </label>
                <textarea
                  id="rawCVText"
                  name="rawCVText"
                  value={formData.rawCVText}
                  onChange={handleInputChange}
                  rows={12}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-mono text-sm ${
                    errors.rawCVText ? "border-destructive" : "border-input"
                  }`}
                  placeholder="Paste the complete CV text here. Supports large content and preserves formatting..."
                />
                <div className="mt-1 flex justify-between flex-wrap gap-1">
                  {errors.rawCVText && (
                    <p className="text-sm text-destructive">{errors.rawCVText}</p>
                  )}
                  <p className={`text-sm font-body ${
                    formData.rawCVText.length > 20000 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {formData.rawCVText.length.toLocaleString()} / 20,000 characters
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-body">
                  Supports large text content. Paste the complete CV including all sections, experience, education, etc.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ fullName: "", email: "", rawCVText: "" });
                    setErrors({ fullName: "", rawCVText: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Adding..." : "Add Candidate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
