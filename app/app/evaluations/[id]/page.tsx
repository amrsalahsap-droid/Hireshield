"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/ui/ErrorState";

interface Evaluation {
  id: string;
  jobId: string;
  candidateId: string;
  job: {
    id: string;
    title: string;
  };
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
  };
  signalsJson: any;
  signalsPromptVersion: string | null;
  signalsGeneratedAt: string | null;
  rawModelOutputSnippet: string | null;
  finalScoreJson: any;
  createdAt: string;
  updatedAt: string;
}

export default function EvaluationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingSignals, setIsGeneratingSignals] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);

  // Fetch evaluation details
  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`/api/evaluations/${params.id}`, {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluation(data.evaluation);
      } else if (response.status === 404) {
        setError("Evaluation not found");
      } else {
        throw new Error("Failed to load evaluation details");
      }
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      setError("Unable to load evaluation details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await fetchEvaluation();
  };

  // Generate Signals function
  const generateSignals = async () => {
    if (!evaluation) return;
    
    setIsGeneratingSignals(true);
    setSignalsError(null);
    
    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/generate-signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'cmm87bloy0000v9nvvzyt6aqn'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh evaluation data to show the signals results
        await fetchEvaluation();
      } else {
        const errorData = await response.json();
        setSignalsError(errorData.error || 'Failed to generate candidate signals');
      }
    } catch (error) {
      console.error("Error generating signals:", error);
      setSignalsError('Network error occurred while generating candidate signals');
    } finally {
      setIsGeneratingSignals(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      refreshData();
    }
  }, [params.id]);

  // Loading state
  if (loading) {
    return <LoadingState message="Loading evaluation details..." />;
  }

  // 404 error state
  if (error === "Evaluation not found" || !evaluation) {
    return (
      <ErrorState
        title="Evaluation Not Found"
        message="The evaluation you're looking for doesn't exist or has been removed."
        onBack={() => router.push("/app/jobs")}
        backText="Back to Jobs"
        icon="📊"
      />
    );
  }

  // General error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Evaluation"
        message={error}
        onRetry={refreshData}
        onBack={() => router.push("/app/jobs")}
        backText="Back to Jobs"
      />
    );
  }

  const hasAIResults = evaluation.signalsJson && evaluation.finalScoreJson;

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
            <Link
              href={`/app/jobs/${evaluation.jobId}`}
              className="text-gray-500 hover:text-gray-700"
            >
              {evaluation.job.title}
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">
              {evaluation.candidate.fullName} - Evaluation
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              hasAIResults 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {hasAIResults ? "Completed" : "Pending AI Analysis"}
            </span>
          </div>
        </div>
        <p className="text-gray-600">
          {hasAIResults 
            ? "View AI-powered evaluation results and insights."
            : "Evaluation created successfully. AI analysis is in progress."
          }
        </p>
      </div>

      {/* Evaluation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          <div className={`rounded-lg p-6 ${
            hasAIResults 
              ? "bg-green-50 border border-green-200" 
              : "bg-yellow-50 border border-yellow-200"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {hasAIResults ? (
                    <div className="text-green-400 text-2xl">✅</div>
                  ) : (
                    <div className="text-yellow-400 text-2xl">⏳</div>
                  )}
                </div>
                <div className="ml-4">
                  <h3 className={`text-lg font-medium ${
                    hasAIResults ? "text-green-800" : "text-yellow-800"
                  }`}>
                    {hasAIResults ? "AI Analysis Complete" : "Pending AI Analysis"}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    hasAIResults ? "text-green-700" : "text-yellow-700"
                  }`}>
                    {hasAIResults 
                      ? "AI has analyzed this candidate and provided detailed insights."
                      : "AI analysis is currently being processed. Results will appear here once complete."
                    }
                  </p>
                </div>
              </div>
              {!evaluation.signalsJson && (
                <button
                  onClick={generateSignals}
                  disabled={isGeneratingSignals}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingSignals ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      🧠 Generate Signals
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Signals Error Alert */}
          {signalsError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-red-400 text-lg">⚠️</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Signals Generation Failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {signalsError}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setSignalsError(null)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Results Section */}
          {hasAIResults ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">AI Analysis Results</h2>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Signals Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-medium text-gray-900">Candidate Signals</h3>
                    {evaluation.signalsPromptVersion && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        v{evaluation.signalsPromptVersion}
                      </span>
                    )}
                  </div>
                  
                  {evaluation.signalsJson ? (
                    <div className="space-y-4">
                      {/* Summary */}
                      {evaluation.signalsJson.candidateSummary && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                          <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                          <p className="text-blue-800 text-sm">{evaluation.signalsJson.candidateSummary}</p>
                        </div>
                      )}

                      {/* Category Ratings */}
                      {evaluation.signalsJson.categoryRatings && (
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900 mb-3">Category Ratings</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(evaluation.signalsJson.categoryRatings).map(([category, rating]) => (
                              <div key={category} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 capitalize">
                                  {category.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <div className="flex items-center">
                                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-indigo-600 h-2 rounded-full" 
                                      style={{ width: `${(Number(rating) * 20)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{Number(rating)}/5</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths */}
                      {evaluation.signalsJson.strengths && evaluation.signalsJson.strengths.length > 0 && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                          <h4 className="font-medium text-green-900 mb-3">Strengths ({evaluation.signalsJson.strengths.length})</h4>
                          <ul className="space-y-3">
                            {evaluation.signalsJson.strengths.map((strength: any, index: number) => (
                              <li key={index} className="text-green-800">
                                <p className="text-sm font-medium">• {strength.point}</p>
                                {strength.evidence && (
                                  <blockquote className="mt-1 pl-3 border-l-2 border-green-300 text-xs text-green-700 italic">
                                    "{strength.evidence.content}"
                                    <span className="block text-xs text-green-600 mt-1">
                                      — {strength.evidence.source}
                                    </span>
                                  </blockquote>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Gaps */}
                      {evaluation.signalsJson.gaps && evaluation.signalsJson.gaps.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                          <h4 className="font-medium text-yellow-900 mb-3">Areas for Development ({evaluation.signalsJson.gaps.length})</h4>
                          <ul className="space-y-3">
                            {evaluation.signalsJson.gaps.map((gap: any, index: number) => (
                              <li key={index} className="text-yellow-800">
                                <p className="text-sm font-medium">• {gap.point}</p>
                                {gap.evidence && (
                                  <blockquote className="mt-1 pl-3 border-l-2 border-yellow-300 text-xs text-yellow-700 italic">
                                    "{gap.evidence.content}"
                                    <span className="block text-xs text-yellow-600 mt-1">
                                      — {gap.evidence.source}
                                    </span>
                                  </blockquote>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Risk Flags */}
                      {evaluation.signalsJson.riskFlags && evaluation.signalsJson.riskFlags.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                          <h4 className="font-medium text-red-900 mb-3">Risk Flags ({evaluation.signalsJson.riskFlags.length})</h4>
                          <ul className="space-y-3">
                            {evaluation.signalsJson.riskFlags.map((risk: any, index: number) => (
                              <li key={index} className="text-red-800">
                                <div className="flex items-start">
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mr-2 mt-0.5">
                                    {risk.severity}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium">{risk.flag}</p>
                                    <p className="text-xs text-red-700 mt-1">{risk.whyItMatters}</p>
                                    {risk.evidence && (
                                      <blockquote className="mt-1 pl-3 border-l-2 border-red-300 text-xs text-red-700 italic">
                                        "{risk.evidence.content}"
                                        <span className="block text-xs text-red-600 mt-1">
                                          — {risk.evidence.source}
                                        </span>
                                      </blockquote>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Verification Questions */}
                      {evaluation.signalsJson.verificationQuestions && evaluation.signalsJson.verificationQuestions.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-md">
                          <h4 className="font-medium text-purple-900 mb-3">Questions for Verification ({evaluation.signalsJson.verificationQuestions.length})</h4>
                          <ul className="space-y-2">
                            {evaluation.signalsJson.verificationQuestions.map((question: string, index: number) => (
                              <li key={index} className="text-purple-800 text-sm">
                                • {question}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Generation Info */}
                      {evaluation.signalsGeneratedAt && (
                        <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                          Generated on {new Date(evaluation.signalsGeneratedAt).toLocaleString()}
                          {evaluation.signalsPromptVersion && ` using prompt version ${evaluation.signalsPromptVersion}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500 text-sm">
                      No signals data available
                    </div>
                  )}
                </div>

                {/* Final Score Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Final Score</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(evaluation.finalScoreJson, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">AI Analysis Results</h2>
              </div>
              <div className="px-6 py-4">
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">🤖</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis In Progress</h3>
                  <p className="text-gray-500 mb-6">
                    Our AI is currently analyzing this candidate's profile and interview data. 
                    Results will appear here automatically once processing is complete.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-2">What to expect:</p>
                      <ul className="text-left space-y-1">
                        <li>• Detailed evaluation signals</li>
                        <li>• Final scoring and recommendations</li>
                        <li>• Strengths and areas for improvement</li>
                        <li>• Fit assessment for the role</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluation Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Evaluation Information</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Candidate</dt>
                  <dd className="mt-1 text-sm text-gray-900">{evaluation.candidate.fullName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job</dt>
                  <dd className="mt-1 text-sm text-gray-900">{evaluation.job.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(evaluation.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(evaluation.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Link
                href={`/app/candidates/${evaluation.candidateId}`}
                className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                View Candidate Profile
              </Link>
              <Link
                href={`/app/jobs/${evaluation.jobId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                View Job Details
              </Link>
              {!hasAIResults && (
                <button className="block w-full px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors">
                  Request AI Analysis
                </button>
              )}
            </div>
          </div>

          {/* Evaluation Metadata */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Evaluation Metadata</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Evaluation ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {evaluation.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    hasAIResults 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {hasAIResults ? "Completed" : "Pending AI Analysis"}
                  </span>
                </dd>
              </div>
              
              {/* Signals Metadata */}
              {evaluation.signalsGeneratedAt && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Signals Generated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(evaluation.signalsGeneratedAt).toLocaleString()}
                    </dd>
                  </div>
                  {evaluation.signalsPromptVersion && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Signals Prompt Version</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        v{evaluation.signalsPromptVersion}
                      </dd>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {hasAIResults ? "Completed" : "In Progress"}
                </dd>
              </div>
              
              {/* Debug Info */}
              {evaluation.rawModelOutputSnippet && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Debug Information</dt>
                  <dd className="mt-1">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800">
                        View raw output snippet ({evaluation.rawModelOutputSnippet.length} chars)
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {evaluation.rawModelOutputSnippet}
                      </pre>
                    </details>
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
