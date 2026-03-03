"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/ui/ErrorState";
import { JDExtractionViewer } from "@/components/jobs/jd-extraction-viewer";

interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rawJD: string;
  jdExtractionJson: any;
  jdAnalyzedAt: string | null;
  jdPromptVersion: string | null;
  jdAnalysisStatus: 'NOT_STARTED' | 'RUNNING' | 'DONE' | 'FAILED';
  jdLastError: string | null;
  interviewKitJson: any;
  interviewKitGeneratedAt: string | null;
  interviewKitPromptVersion: string | null;
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
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisRequestId, setAnalysisRequestId] = useState<string | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);
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
        throw new Error("Failed to load job details");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      setError("Unable to load job details. Please try again.");
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
      } else {
        console.error("Error fetching interviews");
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
      } else {
        console.error("Error fetching evaluations");
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
      } else {
        console.error("Error fetching candidates");
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  // Analyze JD function
  const analyzeJD = async () => {
    if (!job) return;
    
    setIsAnalyzingJD(true);
    setAnalysisError(null);
    setAnalysisRequestId(null);
    
    try {
      const response = await fetch(`/api/jobs/${job.id}/analyze-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'cmm87bloy0000v9nvvzyt6aqn'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh job data to show the analysis results
        await fetchJob();
      } else {
        const errorData = await response.json();
        setAnalysisError(errorData.error || 'Failed to analyze job description');
        setAnalysisRequestId(errorData.requestId || null);
      }
    } catch (error) {
      console.error("Error analyzing JD:", error);
      setAnalysisError('Network error occurred while analyzing job description');
      setAnalysisRequestId(null);
    } finally {
      setIsAnalyzingJD(false);
    }
  };

  // Re-analyze JD function (uses force=1)
  const reanalyzeJD = async () => {
    if (!job) return;
    
    setIsAnalyzingJD(true);
    setAnalysisError(null);
    setAnalysisRequestId(null);
    
    try {
      const response = await fetch(`/api/jobs/${job.id}/analyze-jd?force=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'cmm87bloy0000v9nvvzyt6aqn'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh job data to show the new analysis results
        await fetchJob();
      } else {
        const errorData = await response.json();
        setAnalysisError(errorData.error || 'Failed to re-analyze job description');
        setAnalysisRequestId(errorData.requestId || null);
      }
    } catch (error) {
      console.error("Error re-analyzing JD:", error);
      setAnalysisError('Network error occurred while re-analyzing job description');
      setAnalysisRequestId(null);
    } finally {
      setIsAnalyzingJD(false);
    }
  };

  // Generate Interview Kit function
  const generateInterviewKit = async () => {
    if (!job) return;
    
    setIsGeneratingKit(true);
    setKitError(null);
    
    try {
      const response = await fetch(`/api/jobs/${job.id}/generate-interview-kit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'cmm87bloy0000v9nvvzyt6aqn'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh job data to show the interview kit results
        await fetchJob();
      } else {
        const errorData = await response.json();
        setKitError(errorData.error || 'Failed to generate interview kit');
      }
    } catch (error) {
      console.error("Error generating interview kit:", error);
      setKitError('Network error occurred while generating interview kit');
    } finally {
      setIsGeneratingKit(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchJob(), fetchInterviews(), fetchEvaluations(), fetchCandidates()])
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (params.id) {
      refreshData();
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
    return <LoadingState message="Loading job details..." />;
  }

  // 404 error state
  if (error === "Job not found" || !job) {
    return (
      <ErrorState
        title="Job Not Found"
        message="The job you're looking for doesn't exist or has been removed."
        onBack={() => router.push("/app/jobs")}
        backText="Back to Jobs"
        icon="💼"
      />
    );
  }

  // General error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Job"
        message={error}
        onRetry={refreshData}
        onBack={() => router.push("/app/jobs")}
        backText="Back to Jobs"
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
        <button
          onClick={job?.jdExtractionJson ? reanalyzeJD : analyzeJD}
          disabled={isAnalyzingJD || !job?.rawJD}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzingJD ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {job?.jdExtractionJson ? 'Re-analyzing...' : 'Analyzing...'}
            </>
          ) : (
            <>
              🔍 {job?.jdExtractionJson ? 'Re-analyze JD' : 'Analyze JD'}
            </>
          )}
        </button>
        <button
          onClick={generateInterviewKit}
          disabled={isGeneratingKit || !job?.jdExtractionJson}
          title={!job?.jdExtractionJson ? "Analyze JD first" : ""}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingKit ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              📋 Generate Interview Kit
            </>
          )}
        </button>
      </div>

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-red-400 text-lg">⚠️</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Analysis Failed</h3>
              <div className="mt-2 text-sm text-red-700">
                {analysisError}
              </div>
              {analysisRequestId && (
                <div className="mt-2 text-xs text-red-600">
                  Request ID: {analysisRequestId}
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => {
                    setAnalysisError(null);
                    setAnalysisRequestId(null);
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kit Generation Error Alert */}
      {kitError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-red-400 text-lg">⚠️</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Kit Generation Failed</h3>
              <div className="mt-2 text-sm text-red-700">
                {kitError}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setKitError(null)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JD Analysis Required Warning */}
      {!job?.jdExtractionJson && job?.rawJD && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-yellow-400 text-lg">💡</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Interview Kit Generation</h3>
              <div className="mt-2 text-sm text-yellow-700">
                Analyze the job description first to generate a comprehensive interview kit tailored to the role requirements.
              </div>
              <div className="mt-4">
                <button
                  onClick={analyzeJD}
                  disabled={isAnalyzingJD}
                  className="text-sm font-medium text-yellow-600 hover:text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzingJD ? 'Analyzing...' : 'Analyze JD First'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

          {/* JD Analysis Results */}
          {job.jdExtractionJson && (
            <JDExtractionViewer
              extraction={job.jdExtractionJson}
              analyzedAt={job.jdAnalyzedAt}
              promptVersion={job.jdPromptVersion}
            />
          )}

          {/* Interview Kit Results */}
          {job.interviewKitJson && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Interview Kit</h2>
                  <div className="flex items-center space-x-2">
                    {job.interviewKitPromptVersion && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        v{job.interviewKitPromptVersion}
                      </span>
                    )}
                    {job.interviewKitGeneratedAt && (
                      <span className="text-xs text-gray-500">
                        Generated {new Date(job.interviewKitGeneratedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Role Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Role Title</h3>
                  <p className="text-sm text-gray-700">{job.interviewKitJson.roleTitle || 'Not specified'}</p>
                </div>

                {/* Competencies */}
                {job.interviewKitJson.competencies && job.interviewKitJson.competencies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Core Competencies ({job.interviewKitJson.competencies.length})</h3>
                    <div className="space-y-4">
                      {job.interviewKitJson.competencies.map((competency: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">{competency.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{competency.definition}</p>
                          
                          {/* Questions by Type */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Behavioral Questions */}
                            {competency.questions?.behavioral && competency.questions.behavioral.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Behavioral ({competency.questions.behavioral.length})</h5>
                                <div className="space-y-2">
                                  {competency.questions.behavioral.map((question: any, qIndex: number) => (
                                    <div key={qIndex} className="bg-blue-50 p-2 rounded text-xs">
                                      <p className="font-medium text-blue-800">{question.question}</p>
                                      <p className="text-blue-600 mt-1">Good: {question.whatGoodLooksLike}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Technical Questions */}
                            {competency.questions?.technical && competency.questions.technical.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Technical ({competency.questions.technical.length})</h5>
                                <div className="space-y-2">
                                  {competency.questions.technical.map((question: any, qIndex: number) => (
                                    <div key={qIndex} className="bg-green-50 p-2 rounded text-xs">
                                      <p className="font-medium text-green-800">{question.question}</p>
                                      <p className="text-green-600 mt-1">Good: {question.whatGoodLooksLike}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Scenario Questions */}
                            {competency.questions?.scenario && competency.questions.scenario.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Scenario ({competency.questions.scenario.length})</h5>
                                <div className="space-y-2">
                                  {competency.questions.scenario.map((question: any, qIndex: number) => (
                                    <div key={qIndex} className="bg-purple-50 p-2 rounded text-xs">
                                      <p className="font-medium text-purple-800">{question.question}</p>
                                      <p className="text-purple-600 mt-1">Good: {question.whatGoodLooksLike}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Culture Fit Questions */}
                            {competency.questions?.cultureFit && competency.questions.cultureFit.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Culture Fit ({competency.questions.cultureFit.length})</h5>
                                <div className="space-y-2">
                                  {competency.questions.cultureFit.map((question: any, qIndex: number) => (
                                    <div key={qIndex} className="bg-yellow-50 p-2 rounded text-xs">
                                      <p className="font-medium text-yellow-800">{question.question}</p>
                                      <p className="text-yellow-600 mt-1">Good: {question.whatGoodLooksLike}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Red Flag Probes */}
                            {competency.questions?.redFlagProbes && competency.questions.redFlagProbes.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-700 mb-2">Red Flag Probes ({competency.questions.redFlagProbes.length})</h5>
                                <div className="space-y-2">
                                  {competency.questions.redFlagProbes.map((question: any, qIndex: number) => (
                                    <div key={qIndex} className="bg-red-50 p-2 rounded text-xs">
                                      <p className="font-medium text-red-800">{question.question}</p>
                                      <p className="text-red-600 mt-1">Good: {question.whatGoodLooksLike}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scoring Guide Reference */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Scoring Guide Reference</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium">1 - Poor:</span> Response does not meet expectations</p>
                    <p><span className="font-medium">3 - Average:</span> Response meets basic expectations</p>
                    <p><span className="font-medium">5 - Excellent:</span> Response exceeds expectations</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* JD Analysis */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">JD Analysis</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {job.jdExtractionJson ? (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Analysis Status</dt>
                      <dd className="mt-1">
                        <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Analyzed
                        </div>
                      </dd>
                    </div>
                    {job.jdPromptVersion && (
                      <div className="text-right">
                        <dt className="text-sm font-medium text-gray-500">Prompt Version</dt>
                        <dd className="mt-1">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            v{job.jdPromptVersion}
                          </span>
                        </dd>
                      </div>
                    )}
                  </div>
                  {job.jdAnalyzedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Analyzed At</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(job.jdAnalyzedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Analysis Data</dt>
                    <dd className="mt-1">
                      <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(job.jdExtractionJson, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-3">📋</div>
                  <p className="text-gray-500 mb-4">No JD analysis available</p>
                  <p className="text-sm text-gray-400">
                    Job description analysis will be performed when needed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interview Kit */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Interview Kit</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {job.interviewKitJson ? (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Kit Status</dt>
                      <dd className="mt-1">
                        <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          ✓ Generated
                        </div>
                      </dd>
                    </div>
                    {job.interviewKitPromptVersion && (
                      <div className="text-right">
                        <dt className="text-sm font-medium text-gray-500">Prompt Version</dt>
                        <dd className="mt-1">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            v{job.interviewKitPromptVersion}
                          </span>
                        </dd>
                      </div>
                    )}
                  </div>
                  {job.interviewKitGeneratedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(job.interviewKitGeneratedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Kit Data</dt>
                    <dd className="mt-1">
                      <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(job.interviewKitJson, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-3">📝</div>
                  <p className="text-gray-500 mb-4">No interview kit available</p>
                  <p className="text-sm text-gray-400">
                    Interview kit will be generated when needed for this job.
                  </p>
                </div>
              )}
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
