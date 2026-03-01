"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rawJD: string;
}

interface Interview {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
  };
  transcriptText: string;
  createdAt: string;
}

interface Evaluation {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
  };
  signalsJson: any;
  finalScoreJson: any;
  createdAt: string;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [isCreatingEvaluation, setIsCreatingEvaluation] = useState(false);
  const [formErrors, setFormErrors] = useState({
    candidate: "",
    transcript: "",
    evaluationCandidate: ""
  });

  // Fetch job details
  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else if (response.status === 404) {
        setError("Job not found");
      } else {
        setError("Failed to load job details");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      setError("Failed to load job details");
    }
  };

  // Fetch interviews for this job
  const fetchInterviews = async () => {
    try {
      const response = await fetch(`/api/interviews?jobId=${params.id}`, {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
    }
  };

  // Fetch evaluations for this job
  const fetchEvaluations = async () => {
    try {
      const response = await fetch(`/api/evaluations?jobId=${params.id}`, {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    }
  };

  // Fetch candidates for interview creation
  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates", {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      Promise.all([fetchJob(), fetchInterviews(), fetchEvaluations(), fetchCandidates()])
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  // Handle interview creation
  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {
      candidate: "",
      transcript: "",
      evaluationCandidate: ""
    };

    if (!selectedCandidate) {
      newErrors.candidate = "Please select a candidate";
    }

    if (!transcript.trim()) {
      newErrors.transcript = "Interview transcript is required";
    } else if (transcript.length > 50000) {
      newErrors.transcript = "Interview transcript must be less than 50,000 characters";
    }

    setFormErrors(newErrors);

    if (newErrors.candidate || newErrors.transcript) {
      return;
    }

    setIsCreatingInterview(true);
    
    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn"
        },
        body: JSON.stringify({
          jobId: params.id,
          candidateId: selectedCandidate,
          transcriptText: transcript.trim()
        })
      });

      if (response.ok) {
        // Reset form and close modal
        setSelectedCandidate("");
        setTranscript("");
        setShowInterviewModal(false);
        setFormErrors({ candidate: "", transcript: "", evaluationCandidate: "" });
        
        // Refresh interviews list
        await fetchInterviews();
      } else {
        const error = await response.json();
        console.error("Error creating interview:", error);
        
        // Handle validation errors from server
        if (error.error && response.status === 400) {
          // Parse error message to set appropriate field errors
          if (error.error.includes("candidate")) {
            setFormErrors(prev => ({ ...prev, candidate: error.error }));
          } else if (error.error.includes("transcript") || error.error.includes("characters")) {
            setFormErrors(prev => ({ ...prev, transcript: error.error }));
          } else {
            // Generic error
            setFormErrors({ candidate: error.error, transcript: "", evaluationCandidate: "" });
          }
        }
      }
    } catch (error) {
      console.error("Error creating interview:", error);
    } finally {
      setIsCreatingInterview(false);
    }
  };

  // Handle evaluation creation
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {
      candidate: "",
      transcript: "",
      evaluationCandidate: ""
    };

    if (!selectedCandidate) {
      newErrors.evaluationCandidate = "Please select a candidate";
    }

    setFormErrors(newErrors);

    if (newErrors.evaluationCandidate) {
      return;
    }

    setIsCreatingEvaluation(true);
    
    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn"
        },
        body: JSON.stringify({
          jobId: params.id,
          candidateId: selectedCandidate
        })
      });

      if (response.ok) {
        // Reset form and close modal
        setSelectedCandidate("");
        setShowEvaluationModal(false);
        setFormErrors({ candidate: "", transcript: "", evaluationCandidate: "" });
        
        // Refresh evaluations list
        await fetchEvaluations();
      } else {
        const error = await response.json();
        console.error("Error creating evaluation:", error);
      }
    } catch (error) {
      console.error("Error creating evaluation:", error);
    } finally {
      setIsCreatingEvaluation(false);
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading job details...</div>
        </div>
      </div>
    );
  }

  // 404 error state
  if (error === "Job not found" || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
          <p className="text-gray-600 mb-6">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/app/jobs"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            ← Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  // General error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/app/jobs"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/app/jobs"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Jobs
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          </div>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
        </div>
        <p className="text-gray-600">
          Manage job details and track candidate applications.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/app/candidates"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          👤 Add Candidate
        </Link>
        <button
          onClick={() => setShowInterviewModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          🎤 Create Interview
        </button>
        <button
          onClick={() => setShowEvaluationModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          📊 Create Evaluation
        </button>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Job Description</h2>
            </div>
            <div className="px-6 py-4">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-md">
                  {job.rawJD}
                </pre>
              </div>
            </div>
          </div>

          {/* Linked Interviews & Evaluations */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Linked Interviews & Evaluations</h2>
            </div>
            <div className="px-6 py-4">
              {interviews.length === 0 && evaluations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-3">📋</div>
                  <p className="text-gray-500 mb-4">No interviews or evaluations yet</p>
                  <div className="space-x-3">
                    <Link
                      href="/app/candidates"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      Add Candidate
                    </Link>
                    <button
                      onClick={() => setShowInterviewModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Create Interview
                    </button>
                    <button
                      onClick={() => setShowEvaluationModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Create Evaluation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Interviews */}
                  {interviews.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Interviews ({interviews.length})</h3>
                      <div className="space-y-2">
                        {interviews.map((interview) => (
                          <div key={interview.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div>
                              <div className="font-medium text-gray-900">{interview.candidate.fullName}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(interview.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Link
                              href={`/app/interviews/${interview.id}`}
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
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
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Evaluations ({evaluations.length})</h3>
                      <div className="space-y-2">
                        {evaluations.map((evaluation) => (
                          <div key={evaluation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div>
                              <div className="font-medium text-gray-900">{evaluation.candidate.fullName}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(evaluation.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Link
                              href={`/app/evaluations/${evaluation.id}`}
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
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
          {/* Job Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Job Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(job.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(job.updatedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {job.id}
                </dd>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Stats</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Interviews</span>
                <span className="text-sm font-medium text-gray-900">{interviews.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Evaluations</span>
                <span className="text-sm font-medium text-gray-900">{evaluations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Candidates</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Set([...interviews.map(i => i.candidateId), ...evaluations.map(e => e.candidateId)]).size}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create Interview
              </h3>
              
              <form onSubmit={handleCreateInterview} className="space-y-4">
                <div>
                  <label htmlFor="candidate" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Candidate *
                  </label>
                  <select
                    id="candidate"
                    value={selectedCandidate}
                    onChange={(e) => {
                      setSelectedCandidate(e.target.value);
                      if (formErrors.candidate) {
                        setFormErrors(prev => ({ ...prev, candidate: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.candidate ? "border-red-500" : "border-gray-300"
                    }`}
                    required
                  >
                    <option value="">Choose a candidate...</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName} {candidate.email && `(${candidate.email})`}
                      </option>
                    ))}
                  </select>
                  {formErrors.candidate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.candidate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-1">
                    Interview Transcript *
                  </label>
                  <textarea
                    id="transcript"
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      if (formErrors.transcript) {
                        setFormErrors(prev => ({ ...prev, transcript: "" }));
                      }
                    }}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.transcript ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Paste or type the interview transcript here..."
                    required
                  />
                  <div className="mt-1 flex justify-between">
                    {formErrors.transcript && (
                      <p className="text-sm text-red-600">{formErrors.transcript}</p>
                    )}
                    <p className={`text-sm ${
                      transcript.length > 50000 ? "text-red-600" : "text-gray-500"
                    }`}>
                      {transcript.length.toLocaleString()} / 50,000 characters
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInterviewModal(false);
                      setSelectedCandidate("");
                      setTranscript("");
                      setFormErrors({ candidate: "", transcript: "", evaluationCandidate: "" });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingInterview}
                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingInterview ? "Creating..." : "Create Interview"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Evaluation Modal */}
      {showEvaluationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create Evaluation
              </h3>
              
              <form onSubmit={handleCreateEvaluation} className="space-y-4">
                <div>
                  <label htmlFor="evaluationCandidate" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Candidate *
                  </label>
                  <select
                    id="evaluationCandidate"
                    value={selectedCandidate}
                    onChange={(e) => {
                      setSelectedCandidate(e.target.value);
                      if (formErrors.evaluationCandidate) {
                        setFormErrors(prev => ({ ...prev, evaluationCandidate: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.evaluationCandidate ? "border-red-500" : "border-gray-300"
                    }`}
                    required
                  >
                    <option value="">Choose a candidate...</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName} {candidate.email && `(${candidate.email})`}
                      </option>
                    ))}
                  </select>
                  {formErrors.evaluationCandidate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.evaluationCandidate}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> This will create an evaluation placeholder. 
                    AI analysis will be processed later and the results will appear here.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEvaluationModal(false);
                      setSelectedCandidate("");
                      setFormErrors({ candidate: "", transcript: "", evaluationCandidate: "" });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingEvaluation}
                    className="px-4 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingEvaluation ? "Creating..." : "Create Evaluation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
