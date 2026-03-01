"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
        setError("Failed to load evaluation details");
      }
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      setError("Failed to load evaluation details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchEvaluation();
    }
  }, [params.id]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading evaluation details...</div>
        </div>
      </div>
    );
  }

  // 404 error state
  if (error === "Evaluation not found" || !evaluation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Not Found</h1>
          <p className="text-gray-600 mb-6">
            The evaluation you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/app/jobs"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
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
          </div>

          {/* AI Results Section */}
          {hasAIResults ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">AI Analysis Results</h2>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Signals Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Evaluation Signals</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(evaluation.signalsJson, null, 2)}
                    </pre>
                  </div>
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
              <div>
                <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {hasAIResults ? "Completed" : "In Progress"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
