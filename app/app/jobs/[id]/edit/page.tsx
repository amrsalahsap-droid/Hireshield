"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// Demo org ID
const DEMO_ORG_ID = "cmmk1zo40000212ymhwgz0di8";

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form validation
  const [errors, setErrors] = useState<{title?: string; rawJD?: string}>({});

  // Form state
  const [title, setTitle] = useState("");
  const [rawJD, setRawJD] = useState("");

  const validateForm = () => {
    const newErrors: {title?: string; rawJD?: string} = {};

    if (!title.trim()) {
      newErrors.title = "Job title is required";
    } else if (title.length > 200) {
      newErrors.title = "Job title must be less than 200 characters";
    }

    if (!rawJD.trim()) {
      newErrors.rawJD = "Job description is required";
    } else if (rawJD.length > 10000) {
      newErrors.rawJD = "Job description must be less than 10,000 characters";
    } else if (rawJD.length < 50) {
      newErrors.rawJD = "Job description must be at least 50 characters for meaningful analysis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (params.id) {
      fetchJob();
    }
  }, [params.id]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: {
          "x-org-id": DEMO_ORG_ID
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
        setTitle(data.job.title || "");
        setRawJD(data.job.rawJD || "");
      } else if (response.status === 404) {
        setError("Job not found");
      } else {
        throw new Error("Failed to load job details");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      setError("Unable to load job details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!job || !validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': DEMO_ORG_ID
        },
        body: JSON.stringify({
          title: title.trim(),
          rawJD: rawJD.trim()
        })
      });

      if (response.ok) {
        // Navigate back to job details
        router.push(`/app/jobs/${job.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update job');
      }
    } catch (error) {
      console.error("Error updating job:", error);
      setError('Network error occurred while updating job');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/app/jobs/${params.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Job not found"}</p>
          <Link
            href="/app/jobs"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
              <p className="mt-1 text-sm text-gray-600">
                Update the job details and description
              </p>
            </div>
            <Link
              href={`/app/jobs/${job.id}`}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              ← Back to Job Details
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Job Information</h2>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="text-red-400">⚠️</div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: undefined }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. Senior Frontend Developer"
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="rawJD" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                id="rawJD"
                value={rawJD}
                onChange={(e) => {
                  setRawJD(e.target.value);
                  if (errors.rawJD) {
                    setErrors(prev => ({ ...prev, rawJD: undefined }));
                  }
                }}
                rows={20}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${
                  errors.rawJD ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Paste the complete job description here..."
                required
              />
              {errors.rawJD && (
                <p className="mt-1 text-sm text-red-600">{errors.rawJD}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Include the complete job description with responsibilities, requirements, and qualifications.
              </p>
            </div>

            {/* Character Count */}
            <div className={`text-sm ${
              rawJD.length > 10000 ? 'text-red-600' : 
              rawJD.length < 50 ? 'text-amber-600' : 
              'text-gray-500'
            }`}>
              Character count: {rawJD.length.toLocaleString()} / 10,000 (max)
              {rawJD.length > 10000 && (
                <span className="block mt-1">⚠️ Exceeds maximum length</span>
              )}
              {rawJD.length < 50 && rawJD.length > 0 && (
                <span className="block mt-1">⚠️ Too short for meaningful analysis</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim() || !rawJD.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
