import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  Edit,
  RefreshCw,
  X,
  Plus,
  Target,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { orgFetchHeaders } from '@/lib/client/org-fetch-headers';
import { fingerprintJdExtractionJson } from '@/lib/client/jd-extraction-fingerprint';

type UnifiedIssue = {
  type: 'ambiguity' | 'unrealistic' | 'missing';
  title: string;
  priority: number;
};

/** Same issue keys as the visible list; used so score and issue list stay aligned. */
function collectUnifiedIssues(extraction: any, resolvedIssues: Set<string>): UnifiedIssue[] {
  const issues: UnifiedIssue[] = [];

  if (extraction?.ambiguities) {
    extraction.ambiguities.forEach((ambiguity: any) => {
      const issueKey = `ambiguity-${ambiguity.issue || 'Ambiguity detected'}`;
      if (!resolvedIssues.has(issueKey)) {
        issues.push({
          type: 'ambiguity',
          title: ambiguity.issue || 'Ambiguity detected',
          priority: 1,
        });
      }
    });
  }

  if (extraction?.missingCriteria) {
    extraction.missingCriteria.forEach((criteria: any) => {
      const issueKey = `missing-${criteria.missing || 'Missing criteria'}`;
      if (!resolvedIssues.has(issueKey)) {
        issues.push({
          type: 'missing',
          title: criteria.missing || 'Missing criteria',
          priority: 2,
        });
      }
    });
  }

  if (extraction?.unrealisticExpectations) {
    extraction.unrealisticExpectations.forEach((expectation: any) => {
      const issueKey = `unrealistic-${expectation.issue || 'Unrealistic expectation'}`;
      if (!resolvedIssues.has(issueKey)) {
        issues.push({
          type: 'unrealistic',
          title: expectation.issue || 'Unrealistic expectation',
          priority: 3,
        });
      }
    });
  }

  return issues.sort((a, b) => a.priority - b.priority);
}

function computeQualityScore(extraction: any, resolvedIssues: Set<string>): number {
  if (!extraction) return 0;
  const active = collectUnifiedIssues(extraction, resolvedIssues);

  let score = 50;

  if (extraction.requiredSkills?.length > 0) score += 10;
  if (extraction.keyResponsibilities?.length > 0) score += 10;
  if (extraction.qualifications?.length > 0) score += 10;
  if (extraction.estimatedSalary) score += 10;
  if (extraction.department) score += 5;
  if (extraction.seniorityLevel) score += 5;

  const amb = active.filter((i) => i.type === 'ambiguity').length;
  const miss = active.filter((i) => i.type === 'missing').length;
  const unreal = active.filter((i) => i.type === 'unrealistic').length;
  score -= amb * 5 + miss * 3 + unreal * 7;

  return Math.max(0, Math.min(100, score));
}

interface JDExtractionViewerProps {
  extraction: any;
  job: any;
  analyzedAt?: string;
  promptVersion?: string;
  jobId?: string | null;
  onEditJob?: () => void;
  onAnalysisUpdate?: (newExtraction: any) => void;
  /**
   * Called after a suggestion is persisted so the parent can refetch job (e.g. updated rawJD).
   * Pass optional patch (e.g. jdAnalysisStatus OUTDATED from apply-suggestion) so UI updates before GET returns.
   */
  onSuggestionApplied?: (
    optimisticJobPatch?: Record<string, unknown>,
    analyzePostPayload?: {
      jdExtraction?: unknown;
      analyzedAt?: string | null;
      promptVersion?: string | null;
    }
  ) => void | Promise<void>;
  /** When refined JD is saved but server-side re-analysis fails (viewer may unmount — parent should show this). */
  onRefinedJdReanalysisFailed?: (message: string) => void;
}

export default function JDExtractionViewer({
  extraction,
  job,
  analyzedAt,
  promptVersion,
  jobId,
  onEditJob,
  onSuggestionApplied,
  onRefinedJdReanalysisFailed,
}: JDExtractionViewerProps) {
  const jdExtraction = job?.jdExtractionJson ?? extraction;

  console.log("[JD_VIEWER][PROPS]", { jobId });
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<string>>(new Set());
  const [suggestionPreview, setSuggestionPreview] = useState<{
    isOpen: boolean;
    issueTitle: string;
    suggestion: string;
    issueType: string;
  }>({ isOpen: false, issueTitle: '', suggestion: '', issueType: '' });
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<Map<string, string>>(new Map());
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());
  const [isReRunningAnalysis, setIsReRunningAnalysis] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set());
  /** Session-only hides; does not persist and must not trigger JD re-analysis. */
  const [ignoredIssueKeys, setIgnoredIssueKeys] = useState<Set<string>>(new Set());
  /** After rawJD persist only: forced re-analysis + refetch (see runForcedJdReanalysisThenRefetch). */
  const [isPostApplyAnalysisRunning, setIsPostApplyAnalysisRunning] = useState(false);
  /** True only for the auto re-run triggered by Apply Suggestion (copy for loading overlay). */
  const [isPostApplySuggestionRefresh, setIsPostApplySuggestionRefresh] = useState(false);
  const [postApplyAnalysisError, setPostApplyAnalysisError] = useState<string | null>(null);
  /**
   * If apply-succeeds but we could not merge server fields yet, block trusting DONE+cached extraction
   * until refetch exposes OUTDATED (or non-DONE).
   */
  const [holdAnalysisTrustUntilServerSync, setHoldAnalysisTrustUntilServerSync] =
    useState(false);
  const [isRefiningJd, setIsRefiningJd] = useState(false);
  const [refineJdError, setRefineJdError] = useState<string | null>(null);
  const [refineReview, setRefineReview] = useState<{
    originalJD: string;
    refinedJobDescription: string;
    summary: string;
    changesMade: string[];
    requestId: string;
  } | null>(null);
  const [isApplyingRefinedJd, setIsApplyingRefinedJd] = useState(false);
  const [applyRefinedJdError, setApplyRefinedJdError] = useState<string | null>(null);
  const [refinedJdCopyFeedback, setRefinedJdCopyFeedback] = useState<string | null>(null);

  /**
   * When server-backed JD analysis changes (new run, OUTDATED, etc.), drop all client-only
   * suggestion UI. Prevents stale generated text from matching a different issue after re-order
   * or rewording. Suggestions only repopulate via explicit Generate Suggestion clicks.
   */
  const jdAnalysisEpochKey = [
    job?.jdAnalyzedAt ?? '',
    job?.jdPromptVersion ?? '',
    job?.jdAnalysisStatus ?? '',
    fingerprintJdExtractionJson(jdExtraction),
  ].join('|');

  useEffect(() => {
    setGeneratedSuggestions(new Map());
    setLoadingSuggestions(new Set());
    setSelectedFixes(new Set());
    setSuggestionPreview({
      isOpen: false,
      issueTitle: '',
      suggestion: '',
      issueType: '',
    });
    setApplyError(null);
    setSuggestionError(null);
    setShowBulkPreview(false);
    setResolvedIssues(new Set());
    setIgnoredIssueKeys(new Set());
    setPostApplyAnalysisError(null);
    setRerunError(null);
    setRefineReview(null);
    setRefineJdError(null);
    setApplyRefinedJdError(null);
    setHoldAnalysisTrustUntilServerSync(false);
  }, [jdAnalysisEpochKey]);

  useEffect(() => {
    if (!holdAnalysisTrustUntilServerSync) return;
    if (job?.jdAnalysisStatus && job.jdAnalysisStatus !== 'DONE') {
      setHoldAnalysisTrustUntilServerSync(false);
    }
  }, [job?.jdAnalysisStatus, holdAnalysisTrustUntilServerSync]);

  const POST_APPLY_ANALYSIS_ERROR =
    'Suggestion was applied, but analysis refresh failed. Please re-run analysis.';

  const REFINED_JD_REANALYSIS_FAILED =
    'Refined JD applied, but re-analysis failed. Please re-run analysis.';

  /** Parent refetch only — safe after any server update; does not run JD analysis. */
  const refetchParentJob = async (
    optimisticJobPatch?: Record<string, unknown>,
    analyzePostPayload?: {
      jdExtraction?: unknown;
      analyzedAt?: string | null;
      promptVersion?: string | null;
    }
  ) => {
    await Promise.resolve(onSuggestionApplied?.(optimisticJobPatch, analyzePostPayload));
  };

  /**
   * POST /api/jobs/[id]?force=1 — full JD re-analysis, then parent refetch.
   * Call ONLY when rawJD was just persisted (apply-suggestion, apply-refined-jd server flow, or future batch apply).
   * Do NOT call after generate-suggestion, preview open, copy, dismiss, or ignore.
   */
  const runForcedJdReanalysisThenRefetch = async (): Promise<boolean> => {
    if (!jobId) return false;
    const response = await fetch(`/api/jobs/${jobId}?force=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...orgFetchHeaders(),
      },
    });
    let analyzePostPayload:
      | { jdExtraction?: unknown; analyzedAt?: string | null; promptVersion?: string | null }
      | undefined;
    try {
      analyzePostPayload = (await response.json()) as {
        jdExtraction?: unknown;
        analyzedAt?: string | null;
        promptVersion?: string | null;
      };
    } catch {
      analyzePostPayload = undefined;
    }
    if (!response.ok) return false;
    await refetchParentJob(undefined, analyzePostPayload);
    return true;
  };

  const getQualityLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getHighestPriorityFix = (issues: any[]): string => {
  if (!issues || issues.length === 0) return '';
  
  const topIssue = getHighestPriorityIssue(issues);
  if (!topIssue) return '';
  
  // Create a concise, actionable sentence
  const actionMap: Record<string, string> = {
    'missing': `Add missing ${topIssue.title.toLowerCase().includes('salary') ? 'salary' : 'information'}`,
    'ambiguity': `Clarify vague ${topIssue.title.toLowerCase().includes('requirements') ? 'requirements' : 'details'}`,
    'unrealistic': `Adjust ${topIssue.title.toLowerCase().includes('expectations') ? 'expectations' : 'requirements'}`
  };
  
  return actionMap[topIssue.type] || `Fix: ${topIssue.title}`;
};

const getImproveNextSuggestions = (extraction: any): string[] => {
  const suggestions = [];
  
  // Add 2-4 best-practice suggestions based on common JD patterns
  if (extraction.ambiguities?.length > 0) {
    suggestions.push('Add specific metrics and success criteria');
  }
  
  if (extraction.missingCriteria?.length > 0) {
    suggestions.push('Include salary range and benefits');
  }
  
  if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length < 3) {
    suggestions.push('Expand daily responsibilities section');
  }
  
  if (!extraction.requiredSkills || extraction.requiredSkills.length < 3) {
    suggestions.push('Detail required technologies and tools');
  }
  
  // Add general best practices if we need more suggestions
  if (suggestions.length < 2) {
    suggestions.push('Add company culture and work environment details');
  }
  
  if (suggestions.length < 3) {
    suggestions.push('Include growth opportunities and career path');
  }
  
  return suggestions.slice(0, 4); // Limit to 4 suggestions
};

  const recommendedActionForScore = (score: number): string => {
    if (score >= 80) return 'Publish Job';
    if (score >= 60) return 'Review & Edit';
    return 'Major Revision Needed';
  };

  const getHighestPriorityIssue = (issues: any[]) => {
    if (!issues || issues.length === 0) return null;
    
    return issues.reduce((highest, current) => {
      const currentPriority = getIssuePriority(current);
      const highestPriority = getIssuePriority(highest);
      
      return currentPriority > highestPriority ? current : highest;
    });
  };

  const getIssuePriority = (issue: any): number => {
    const title = issue.title?.toLowerCase() || '';
    const type = issue.type;
    
    // Priority 1: Missing critical skills / missing responsibilities (highest priority)
    if (type === 'missing' && (
      title.includes('skill') || title.includes('responsibilit') || title.includes('requirement')
    )) {
      return 100;
    }
    
    // Priority 2: Missing domain/work context
    if (type === 'missing' && (
      title.includes('domain') || title.includes('industry') || title.includes('company') ||
      title.includes('culture') || title.includes('environment') || title.includes('benefits')
    )) {
      return 90;
    }
    
    // Priority 3: Missing other important info
    if (type === 'missing') {
      return 80;
    }
    
    // Priority 4: Ambiguities affecting candidate understanding
    if (type === 'ambiguity') {
      // Higher priority for ambiguities about core requirements
      if (title.includes('requirement') || title.includes('qualif') || title.includes('skill')) {
        return 70;
      }
      return 60;
    }
    
    // Priority 5: Unrealistic expectations
    if (type === 'unrealistic') {
      // Higher priority for salary/experience expectations
      if (title.includes('salary') || title.includes('experience') || title.includes('year')) {
        return 50;
      }
      return 40;
    }
    
    // Priority 6: Lower priority issues
    return 20;
  };

  const handleFixTopIssue = () => {
    const topIssue = getHighestPriorityIssue(allIssues);
    if (!topIssue) return;
    
    const issueKey = `${topIssue.type}-${topIssue.title}`;
    const issueId = `issue-${topIssue.type}-${topIssue.title?.replace(/\s+/g, '-')}`;
    const element = document.getElementById(issueId);
    
    if (element) {
      // Scroll to the issue
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 3000);
      
      // Check if suggestion already exists
      const existingSuggestion = generatedSuggestions.get(issueKey);
      
      if (existingSuggestion) {
        // Open preview modal directly if suggestion exists
        setSuggestionPreview({
          isOpen: true,
          issueTitle: topIssue.title,
          suggestion: existingSuggestion,
          issueType: topIssue.type,
        });
      } else {
        // Focus on Generate Suggestion button if no suggestion exists
        setTimeout(() => {
          // Find the generate button within the highlighted issue card
          const issueCard = element.closest('[class*="border border-gray-200"]');
          if (issueCard) {
            const generateButton = issueCard.querySelector('button');
            if (generateButton && generateButton.textContent?.includes('Generate Suggestion')) {
              generateButton.focus();
              // Optional: Add visual indicator to draw attention
              generateButton.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
              setTimeout(() => {
                generateButton.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
              }, 2000);
            }
          }
        }, 1000); // Wait for scroll to complete
      }
    }
  };

  const handleGenerateSuggestion = async (issue: any) => {
    console.log("[GENERATE_SUGGESTION][INPUT]", { jobId, issue });
    if (!jobId) {
      throw new Error("Invariant violation: jobId must be defined before generating suggestion");
    }

    const issueKey = `${issue.type}-${issue.title}`;
    console.log('[GENERATE_SUGGESTION][START]', { jobId, issue });

    setLoadingSuggestions(prev => new Set(prev).add(issueKey));
    setSuggestionError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/improve-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...orgFetchHeaders(),
        },
        body: JSON.stringify({
          jobId,
          issueType: issue.type,
          issueDescription: issue.title,
          rawJD: job?.rawJD || ''
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = 'Failed to generate improvement';
        let requestId = null;
        
        if (contentType && contentType.includes("application/json")) {
          // Handle JSON response
          const backendError = await response.json();
          console.error("[GENERATE_SUGGESTION][BACKEND_ERROR]", {
            jobId,
            status: response.status,
            backendError
          });
          
          // Prefer API user message, then technical details (e.g. dev), then short error code
          errorMessage =
            backendError.message ||
            backendError.details ||
            backendError.error ||
            response.statusText ||
            'Failed to generate improvement';
          requestId = backendError.requestId;
        } else {
          // Handle non-JSON response
          const text = await response.text();
          console.error("[GENERATE_SUGGESTION][BACKEND_ERROR_TEXT]", {
            jobId,
            status: response.status,
            text
          });
          
          errorMessage = text || response.statusText || 'Failed to generate improvement';
        }
        
        // Include requestId in error message if available
        if (requestId) {
          errorMessage += ` (Request ID: ${requestId})`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[GENERATE_SUGGESTION][SUCCESS]', { jobId, responseData: data });

      // Store the generated suggestion
      storeGeneratedSuggestion(issueKey, data.suggestion);

      setSuggestionPreview({
        isOpen: true,
        issueTitle: issue.title,
        suggestion: data.suggestion,
        issueType: issue.type,
      });
    } catch (error) {
      console.error('[GENERATE_SUGGESTION][CATCH]', { jobId, error });
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestion';
      setSuggestionError(errorMessage);
    } finally {
      setLoadingSuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueKey);
        return newSet;
      });
    }
  };

  const handleCancelPreview = () => {
    setSuggestionPreview({
      isOpen: false,
      issueTitle: '',
      suggestion: '',
      issueType: '',
    });
    setApplyError(null);
  };

  const handleAddToJobDescription = async () => {
    console.log('[ADD_TO_JD][START]', suggestionPreview);
    
    if (!jobId) {
      setApplyError('Job ID is required to apply suggestion');
      return;
    }

    setIsApplyingSuggestion(true);
    setApplyError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...orgFetchHeaders(),
        },
        body: JSON.stringify({
          suggestionText: suggestionPreview.suggestion,
          issueType: suggestionPreview.issueType,
          issueTitle: suggestionPreview.issueTitle,
          targetSection: suggestionPreview.issueType === 'missing' ? 'Requirements' : undefined
        })
      });

      console.log('[ADD_TO_JD][RESPONSE]', { 
        jobId, 
        status: response.status,
        ok: response.ok 
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = 'Failed to apply suggestion';
        
        if (contentType && contentType.includes("application/json")) {
          const backendError = await response.json();
          console.error("[ADD_TO_JD][BACKEND_ERROR]", {
            jobId,
            status: response.status,
            backendError
          });
          
          errorMessage = backendError.message || backendError.error || backendError.details || response.statusText || 'Failed to apply suggestion';
        } else {
          const text = await response.text();
          console.error("[ADD_TO_JD][BACKEND_ERROR_TEXT]", {
            jobId,
            status: response.status,
            text
          });
          
          errorMessage = text || response.statusText || 'Failed to apply suggestion';
        }
        
        setApplyError(errorMessage);
        return;
      }

      const body = (await response.json()) as {
        data?: {
          jdAnalysisStatus?: string;
          updatedAt?: string;
          interviewKitStatus?: string;
        };
      };
      console.log('[ADD_TO_JD][SUCCESS]', { jobId });

      // 1) Persist complete (apply-suggestion updated rawJD + marked analysis OUTDATED on server).
      // 2) Mirror OUTDATED (and kit status) into parent state immediately so score/issues are not shown as current
      //    while GET / refetch is in flight.
      // 3) Refetch for full job (e.g. rawJD), then forced re-analysis, then refetch again inside runForced*.
      const d = body?.data;
      const optimisticPatch =
        d?.jdAnalysisStatus === 'OUTDATED'
          ? {
              jdAnalysisStatus: 'OUTDATED' as const,
              ...(typeof d.updatedAt === 'string' ? { updatedAt: d.updatedAt } : {}),
              ...(typeof d.interviewKitStatus === 'string'
                ? { interviewKitStatus: d.interviewKitStatus }
                : {}),
            }
          : undefined;

      if (optimisticPatch) {
        setHoldAnalysisTrustUntilServerSync(false);
      } else {
        setHoldAnalysisTrustUntilServerSync(true);
      }

      setIsPostApplySuggestionRefresh(true);
      setIsPostApplyAnalysisRunning(true);
      setPostApplyAnalysisError(null);

      handleCancelPreview();

      try {
        await refetchParentJob(optimisticPatch);
        const ok = await runForcedJdReanalysisThenRefetch();
        if (!ok) {
          setPostApplyAnalysisError(POST_APPLY_ANALYSIS_ERROR);
        }
      } catch {
        setPostApplyAnalysisError(POST_APPLY_ANALYSIS_ERROR);
      } finally {
        setIsPostApplyAnalysisRunning(false);
        setIsPostApplySuggestionRefresh(false);
      }
    } catch (error) {
      console.error('[ADD_TO_JD][CATCH]', { 
        jobId, 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      setApplyError('Failed to apply suggestion. Please try again.');
    } finally {
      setIsApplyingSuggestion(false);
    }
  };

  const getFreshnessState = () => {
    if (!analyzedAt || !job?.updatedAt) return 'unknown';
    const analyzedDate = new Date(analyzedAt);
    const jobDate = new Date(job.updatedAt);
    return jobDate > analyzedDate ? 'outdated' : 'fresh';
  };

  const getIssueWhyMatters = (issue: any): string => {
    switch (issue.type) {
      case 'ambiguity':
        return 'Ambiguous requirements attract unqualified candidates and increase screening time.';
      case 'missing':
        return 'Missing information reduces qualified applicant pool and delays hiring.';
      case 'unrealistic':
        return 'Unrealistic expectations deter qualified candidates and extend time-to-fill.';
      default:
        return 'This issue may impact hiring quality and timeline.';
    }
  };

  const getIssueSuggestedFix = (issue: any): string => {
    switch (issue.type) {
      case 'ambiguity':
        return 'Clarify with specific requirements, measurable criteria, or concrete examples.';
      case 'missing':
        return 'Add essential details like salary range, location, or specific qualifications.';
      case 'unrealistic':
        return 'Adjust expectations to match market standards and role requirements.';
      default:
        return 'Review and refine this section for clarity and completeness.';
    }
  };

  const getIssueScoreImpact = (issue: any): string => {
    switch (issue.type) {
      case 'ambiguity':
        return '-5 points';
      case 'missing':
        return '-3 points';
      case 'unrealistic':
        return '-7 points';
      default:
        return '-2 points';
    }
  };

  const getProjectedScoreImprovement = (issue: any): { category: string; points: number } => {
    const title = issue.title?.toLowerCase() || '';
    
    // Map issue patterns to score categories and projected improvements
    if (title.includes('salary') || title.includes('compensation') || title.includes('pay')) {
      return { category: 'Completeness', points: 8 };
    }
    if (title.includes('location') || title.includes('remote') || title.includes('hybrid')) {
      return { category: 'Completeness', points: 6 };
    }
    if (title.includes('environment') || title.includes('culture') || title.includes('benefits')) {
      return { category: 'Completeness', points: 5 };
    }
    if (title.includes('technolog') || title.includes('tech stack') || title.includes('skills') || title.includes('tools')) {
      return { category: 'Skills Definition', points: 7 };
    }
    if (title.includes('responsibilit') || title.includes('duties') || title.includes('daily')) {
      return { category: 'Responsibility Detail', points: 6 };
    }
    if (title.includes('requirement') || title.includes('qualification') || title.includes('criteria')) {
      return { category: 'Clarity', points: 5 };
    }
    
    // Fallback based on issue type
    switch (issue.type) {
      case 'missing':
        return { category: 'Completeness', points: 6 };
      case 'ambiguity':
        return { category: 'Clarity', points: 5 };
      case 'unrealistic':
        return { category: 'Expectations', points: 4 };
      default:
        return { category: 'Quality', points: 3 };
    }
  };

  const handleIgnoreIssue = (issue: any) => {
    const issueKey = `${issue.type}-${issue.title}`;
    setIgnoredIssueKeys((prev) => new Set(prev).add(issueKey));
    setGeneratedSuggestions((prev) => {
      const next = new Map(prev);
      next.delete(issueKey);
      return next;
    });
    setSelectedFixes((prev) => {
      const next = new Set(prev);
      next.delete(issueKey);
      return next;
    });
  };

  /** User explicitly clicks "Re-run analysis" — does not persist JD; not an auto-refresh. */
  const handleReRunAnalysis = async () => {
    console.log('[RE_RUN_ANALYSIS]', { jobId, isReRunningAnalysis });
    
    if (isReRunningAnalysis || isPostApplyAnalysisRunning) {
      console.log('[RE_RUN_ANALYSIS] Already running, ignoring request');
      return;
    }
    
    setRerunError(null);
    setPostApplyAnalysisError(null);
    setIsReRunningAnalysis(true);

    try {
      const ok = await runForcedJdReanalysisThenRefetch();
      if (!ok) {
        throw new Error('Analysis request failed');
      }
      console.log('[RE_RUN_ANALYSIS] Analysis updated successfully');
    } catch (error) {
      console.error('[RE_RUN_ANALYSIS][FAILED]', { jobId, error });
      setRerunError('Failed to re-run analysis. Please try again or contact support if the issue persists.');
    } finally {
      setIsReRunningAnalysis(false);
    }
  };

  const collectAllSuggestions = () => {
    const suggestions = allIssues.map(issue => {
      const issueKey = `${issue.type}-${issue.title}`;
      const suggestion = generatedSuggestions.get(issueKey);
      return {
        issue,
        issueKey,
        suggestion: suggestion || null,
        isGenerated: !!suggestion,
        isPending: loadingSuggestions.has(issueKey)
      };
    });
    return suggestions;
  };

  const getGeneratedSuggestionsOnly = () => {
    return collectAllSuggestions().filter(s => s.isGenerated);
  };

  const handlePreviewAllFixes = () => {
    const generatedOnly = getGeneratedSuggestionsOnly();
    if (generatedOnly.length === 0) {
      console.log('[PREVIEW_ALL_FIXES] No generated suggestions to preview');
      return;
    }
    setShowBulkPreview(true);
  };

  const handleToggleFixSelection = (issueKey: string) => {
    setSelectedFixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueKey)) {
        newSet.delete(issueKey);
      } else {
        newSet.add(issueKey);
      }
      return newSet;
    });
  };

  const handleApplySelectedFixes = () => {
    console.log('[APPLY_SELECTED_FIXES]', { selectedFixes: Array.from(selectedFixes) });
    // When implemented: persist merged rawJD via API, then runForcedJdReanalysisThenRefetch only on success (same contract as apply-suggestion).
    alert('This would apply selected fixes to the job description');
  };

  const handleRemoveSuggestion = (issueKey: string) => {
    setGeneratedSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.delete(issueKey);
      return newMap;
    });
    setSelectedFixes(prev => {
      const newSet = new Set(prev);
      newSet.delete(issueKey);
      return newSet;
    });
  };

  const handleRefineJobDescription = async () => {
    if (!jobId || isRefiningJd) return;
    setRefineJdError(null);
    setIsRefiningJd(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/refine-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...orgFetchHeaders(),
        },
        body: JSON.stringify({}),
      });

      let payload: Record<string, unknown>;
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        setRefineJdError(
          `Could not read server response (HTTP ${response.status}). Please try again.`
        );
        console.error('[REFINE_JD] Invalid JSON', { status: response.status });
        return;
      }

      if (!response.ok || payload.success === false) {
        const message =
          (typeof payload.message === 'string' && payload.message) ||
          (typeof payload.error === 'string' && payload.error) ||
          'Job description refinement failed.';
        const details =
          typeof payload.details === 'string' ? payload.details : undefined;
        const rid =
          typeof payload.requestId === 'string' ? payload.requestId : undefined;
        const parts = [message, details ? `Details: ${details}` : '', rid ? `Request ID: ${rid}` : ''].filter(
          Boolean
        );
        setRefineJdError(parts.join(' '));
        console.error('[REFINE_JD][BACKEND_ERROR]', {
          jobId,
          status: response.status,
          payload,
        });
        return;
      }

      const data = payload.data as Record<string, unknown> | undefined;
      const refined =
        data && typeof data.refinedJobDescription === 'string'
          ? data.refinedJobDescription
          : '';
      if (!refined.trim()) {
        setRefineJdError('The server returned an empty refined description. Please try again.');
        console.error('[REFINE_JD] Empty refinedJobDescription', payload);
        return;
      }

      setRefineReview({
        originalJD: typeof job?.rawJD === 'string' ? job.rawJD : '',
        refinedJobDescription: refined,
        summary:
          data && typeof data.summary === 'string'
            ? data.summary
            : 'Refined for structure and readability.',
        changesMade: Array.isArray(data?.changesMade)
          ? (data.changesMade as unknown[]).filter((x): x is string => typeof x === 'string')
          : [],
        requestId: typeof payload.requestId === 'string' ? payload.requestId : '',
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Network error while refining the job description.';
      setRefineJdError(msg);
      console.error('[REFINE_JD][CATCH]', { jobId, err });
    } finally {
      setIsRefiningJd(false);
    }
  };

  const closeRefineReview = () => {
    setRefineReview(null);
    setApplyRefinedJdError(null);
    setRefinedJdCopyFeedback(null);
  };

  const handleCopyRefinedJd = async () => {
    if (!refineReview) return;
    const text = refineReview.refinedJobDescription;
    try {
      await navigator.clipboard.writeText(text);
      setRefinedJdCopyFeedback('Copied to clipboard.');
      window.setTimeout(() => setRefinedJdCopyFeedback(null), 2500);
    } catch {
      setRefinedJdCopyFeedback('Could not copy automatically. Select the refined text and copy manually.');
      window.setTimeout(() => setRefinedJdCopyFeedback(null), 4000);
    }
  };

  const handleApplyRefinedJd = async () => {
    if (!jobId || !refineReview || isApplyingRefinedJd) return;
    const raw = refineReview.refinedJobDescription.trim();
    if (raw.length < 50) {
      setApplyRefinedJdError(
        'The refined job description must be at least 50 characters before it can be saved to this job.'
      );
      return;
    }
    if (raw.length > 10000) {
      setApplyRefinedJdError(
        'The refined job description exceeds 10,000 characters. Edit it elsewhere or shorten it before applying.'
      );
      return;
    }

    setIsApplyingRefinedJd(true);
    setApplyRefinedJdError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/apply-refined-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...orgFetchHeaders(),
        },
        body: JSON.stringify({ rawJD: raw }),
      });

      let payload: Record<string, unknown>;
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        setApplyRefinedJdError(
          `Could not read server response (HTTP ${response.status}). Please try again.`
        );
        console.error('[APPLY_REFINED_JD] Invalid JSON', { status: response.status });
        return;
      }

      if (!response.ok || payload.success === false) {
        const message =
          (typeof payload.message === 'string' && payload.message) ||
          (typeof payload.error === 'string' && payload.error) ||
          'Failed to apply refined job description.';
        const details =
          typeof payload.details === 'string' ? payload.details : undefined;
        const rid =
          typeof payload.requestId === 'string' ? payload.requestId : undefined;
        const parts = [
          message,
          details ? `Details: ${details}` : '',
          rid ? `Request ID: ${rid}` : '',
        ].filter(Boolean);
        setApplyRefinedJdError(parts.join(' '));
        console.error('[APPLY_REFINED_JD][BACKEND_ERROR]', {
          jobId,
          status: response.status,
          payload,
        });
        return;
      }

      const analysisSuccess = payload.analysisSuccess === true;
      console.log('[APPLY_REFINED_JD][SUCCESS]', { jobId, analysisSuccess });

      if (!analysisSuccess) {
        const msg =
          (typeof payload.message === 'string' && payload.message) ||
          REFINED_JD_REANALYSIS_FAILED;
        onRefinedJdReanalysisFailed?.(msg);
      }

      await refetchParentJob();

      closeRefineReview();

      if (analysisSuccess) {
        setPostApplyAnalysisError(null);
      }
    } catch (error) {
      console.error('[APPLY_REFINED_JD][CATCH]', { jobId, error });
      setApplyRefinedJdError(
        error instanceof Error ? error.message : 'Network error while saving the job description.'
      );
    } finally {
      setIsApplyingRefinedJd(false);
    }
  };

  const storeGeneratedSuggestion = (issueKey: string, suggestion: string) => {
    setGeneratedSuggestions(prev => new Map(prev.set(issueKey, suggestion)));
  };

  if (!jdExtraction) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">📋</div>
          <p>No analysis available</p>
        </div>
      </div>
    );
  }

  const getTotalIssues = (ext: any) => {
    let total = 0;
    if (ext.ambiguities) total += ext.ambiguities.length;
    if (ext.missingCriteria) total += ext.missingCriteria.length;
    if (ext.unrealisticExpectations) total += ext.unrealisticExpectations.length;
    return total;
  };

  /** True while this viewer is driving or showing a full JD re-run (overlay). */
  const isAnalysisRefreshInFlight =
    isPostApplyAnalysisRunning || isReRunningAnalysis;

  /**
   * Single source of truth for all analysis-derived UI: only DONE + not mid-refresh.
   * OUTDATED / RUNNING / FAILED / NOT_STARTED → do not show cached extraction as current.
   */
  const canTrustStoredAnalysis =
    job?.jdAnalysisStatus === 'DONE' &&
    !!jdExtraction &&
    !isAnalysisRefreshInFlight &&
    !holdAnalysisTrustUntilServerSync;

  const analysisSource = canTrustStoredAnalysis ? jdExtraction : null;

  const score = analysisSource
    ? computeQualityScore(analysisSource, resolvedIssues)
    : null;
  const qualityLabel =
    score !== null ? getQualityLabel(score) : 'Pending refresh';
  const qualityColor =
    score !== null ? getQualityColor(score) : 'text-gray-500';
  const allIssues = analysisSource
    ? collectUnifiedIssues(analysisSource, resolvedIssues).filter(
        (issue) => !ignoredIssueKeys.has(`${issue.type}-${issue.title}`)
      )
    : [];

  const totalIssues = analysisSource ? getTotalIssues(analysisSource) : 0;
  const resolvedCount = resolvedIssues.size;
  const displayRoleTitle =
    analysisSource?.roleTitle || job?.title || 'Unknown Role';

  const showAnalysisLoadingOverlay = isAnalysisRefreshInFlight;

  return (
    <div className="bg-white shadow rounded-lg relative min-h-[240px]">
      {showAnalysisLoadingOverlay && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-white/90 backdrop-blur-[2px] px-6 text-center"
          aria-busy="true"
          aria-live="polite"
        >
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-gray-800">
            {isPostApplySuggestionRefresh
              ? 'Suggestion applied. Re-running analysis…'
              : 'Refreshing JD analysis…'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            {isPostApplySuggestionRefresh
              ? 'Score and issues stay hidden until the new run finishes — nothing below is treated as current yet.'
              : 'Recalculating score, issues, skills, responsibilities, and guidance from your updated JD.'}
          </p>
        </div>
      )}
      {postApplyAnalysisError && (
        <div className="mx-6 mt-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p>{postApplyAnalysisError}</p>
          </div>
        </div>
      )}
      {job?.jdAnalysisStatus === "OUTDATED" && !showAnalysisLoadingOverlay && (
        <div className="mx-6 mt-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p>
              The job description was updated after this analysis. Score and issue details are hidden
              until a fresh run completes — use <strong>Re-run analysis</strong> if needed.
            </p>
          </div>
        </div>
      )}
      {/* 1. Decision Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              {score !== null ? (
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${
                    score >= 80
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : score >= 60
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {score}/100
                </div>
              ) : (
                <div className="inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500">
                  —
                </div>
              )}
              <div>
                <h2 className={`text-xl font-bold ${qualityColor}`}>{qualityLabel}</h2>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {analysisSource ? formatDate(analyzedAt) : 'Awaiting current analysis'}
                    </span>
                    {analysisSource && promptVersion && (
                      <span>v{promptVersion}</span>
                    )}
                    {jobId && (
                      <span>ID: {jobId.slice(-8)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>Debug</span>
                    {showDebugInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Improvement Guidance — only from trusted analysisSource */}
            <div className="bg-white bg-opacity-70 rounded-lg p-4 mb-4">
              {!analysisSource ? (
                <div className="rounded-md border border-amber-100 bg-amber-50/80 px-3 py-3 text-sm text-amber-950">
                  <p className="font-medium">Guidance is paused until analysis matches your latest job description.</p>
                  <p className="mt-1 text-xs text-amber-900/90">
                    {showAnalysisLoadingOverlay
                      ? 'Refreshing score, issues, and recommendations from the updated JD…'
                      : 'Run Re-run analysis to produce a current score and issue list.'}
                  </p>
                </div>
              ) : allIssues.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Highest Priority Fix</h4>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {getHighestPriorityFix(allIssues)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Improve Next</h4>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {getImproveNextSuggestions(analysisSource).map((suggestion, index) => (
                        <li
                          key={`${suggestion.slice(0, 64)}-${index}`}
                          className="flex items-start space-x-2"
                        >
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <button
                      disabled
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-md cursor-not-allowed opacity-60"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Refine full job description — automated (coming soon)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Job description looks good!</p>
                  <p className="text-xs text-gray-600 mt-1">Ready to publish or make final edits.</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-4">
              {!analysisSource ? null : allIssues.length > 0 ? (
                <button
                  onClick={handleFixTopIssue}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Fix Highest-Priority Issue
                </button>
              ) : (
                <button
                  onClick={onEditJob}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  {recommendedActionForScore(score!)}
                </button>
              )}

              {analysisSource && allIssues.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleRefineJobDescription()}
                  disabled={
                    !jobId ||
                    isRefiningJd ||
                    isPostApplyAnalysisRunning ||
                    isReRunningAnalysis
                  }
                  title="Generate an AI-refined draft of the full job description for review. Nothing is saved until you copy or apply changes elsewhere."
                  aria-label="Refine full job description with AI. Opens a review panel; does not save automatically."
                  className="inline-flex items-center px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefiningJd ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Refining…
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Refine Job Description
                    </>
                  )}
                </button>
              )}
              
              {getGeneratedSuggestionsOnly().length > 0 && (
                <button
                  onClick={handlePreviewAllFixes}
                  className="inline-flex items-center px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Preview All Fixes
                </button>
              )}
              
              {jobId && job && (
                <button
                  onClick={handleReRunAnalysis}
                  disabled={
                    isReRunningAnalysis || isPostApplyAnalysisRunning || isRefiningJd
                  }
                  className={`inline-flex items-center px-4 py-3 font-medium rounded-lg transition-colors ${
                    getFreshnessState() === 'outdated' 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                  } ${isReRunningAnalysis || isPostApplyAnalysisRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isReRunningAnalysis || isPostApplyAnalysisRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mr-2"></div>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Re-run Analysis
                    </>
                  )}
                </button>
              )}
            </div>
            {analysisSource && allIssues.length > 0 && (
              <p className="text-xs text-gray-600 mt-3 max-w-3xl leading-relaxed">
                <span className="font-medium text-gray-800">Refine Job Description</span> runs AI on the{' '}
                <span className="font-medium text-gray-800">entire JD</span> and opens a review panel
                (original vs refined, summary, changes). The posting is{' '}
                <span className="font-medium text-gray-800">not updated automatically</span>. For one
                issue, use <span className="font-medium text-gray-800">Generate Suggestion</span> on that
                card below.
              </p>
            )}
            {analysisSource && allIssues.length > 0 && refineJdError && (
              <div
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-w-3xl"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">Refinement failed</p>
                    <p className="mt-1 text-red-800">{refineJdError}</p>
                    <button
                      type="button"
                      onClick={() => setRefineJdError(null)}
                      className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* 2. Role Understanding */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Role Understanding</h3>

          {!analysisSource ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 mb-6 text-sm text-amber-950">
              <p className="font-medium">Role profile pending</p>
              <p className="mt-1 text-amber-900/90">
                Seniority, department, and summary will reflect the latest analysis once it finishes
                running against your current job description.
              </p>
              <p className="mt-3 text-xs text-amber-800">Job title: {job?.title || '—'}</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h2 className="text-2xl font-bold text-gray-900">{displayRoleTitle}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {analysisSource.seniorityLevel && (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1.5 text-gray-400" />
                          {analysisSource.seniorityLevel}
                        </div>
                      )}
                      {analysisSource.department && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                          {analysisSource.department}
                        </div>
                      )}
                      {analysisSource.experienceLevel && (
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1.5 text-gray-400" />
                          {analysisSource.experienceLevel}
                        </div>
                      )}
                    </div>
                  </div>

                  {analysisSource.estimatedSalary &&
                    analysisSource.estimatedSalary.min &&
                    analysisSource.estimatedSalary.max && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">Estimated Salary</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {analysisSource.estimatedSalary.currency}{' '}
                          {analysisSource.estimatedSalary.min.toLocaleString()} -{' '}
                          {analysisSource.estimatedSalary.max.toLocaleString()}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Role Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  This is a {analysisSource.seniorityLevel?.toLowerCase() || ''} position in the{' '}
                  {analysisSource.department?.toLowerCase() || ''} department. The role requires{' '}
                  {analysisSource.experienceLevel?.toLowerCase() || ''} and involves key responsibilities
                  including{' '}
                  {analysisSource.keyResponsibilities?.slice(0, 2).join(', ') || 'various tasks'}.
                </p>
              </div>
            </>
          )}
        </div>

        {/* 3. Fix These Issues */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Fix These Issues</h3>

          {!analysisSource ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              {showAnalysisLoadingOverlay ? (
                <RefreshCw className="h-8 w-8 mx-auto text-gray-400 mb-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              )}
              <p className="font-medium text-gray-800">Issue list not shown for current JD</p>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                {showAnalysisLoadingOverlay
                  ? 'Loading the latest issues from your updated job description…'
                  : 'Run Re-run analysis to load issues that match the current posting.'}
              </p>
            </div>
          ) : allIssues.length > 0 ? (
            <div className="space-y-3">
              {allIssues.map((issue, index) => {
                console.log("[ISSUE_CARD][PROPS]", { jobId, issue: issue.title });
                return (
                <div 
                  key={`${issue.type}-${issue.title}-${index}`}
                  id={`issue-${issue.type}-${issue.title?.replace(/\s+/g, '-')}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Issue Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          issue.type === 'ambiguity' ? 'bg-yellow-500' :
                          issue.type === 'unrealistic' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}></div>
                        <h4 className="text-sm font-semibold text-gray-900">{issue.title}</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {issue.type}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {getIssueScoreImpact(issue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Why This Matters */}
                  <div className="mb-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Why this matters</p>
                        <p className="text-sm text-gray-600">{getIssueWhyMatters(issue)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Fix */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Suggested fix</p>
                        <p className="text-sm text-gray-600">{getIssueSuggestedFix(issue)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Projected Score Impact */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Projected impact</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            +{getProjectedScoreImprovement(issue).points} {getProjectedScoreImprovement(issue).category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleGenerateSuggestion(issue)}
                      disabled={loadingSuggestions.has(`${issue.type}-${issue.title}`) || !jobId}
                      title={!jobId ? (process.env.NODE_ENV === 'development' ? "Job ID missing" : undefined) : undefined}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        !jobId 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60' 
                          : 'text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {loadingSuggestions.has(`${issue.type}-${issue.title}`) ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-2" />
                          Generate Suggestion
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleIgnoreIssue(issue)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      <X className="w-3 h-3 mr-2" />
                      Ignore
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <h4 className="text-lg font-medium text-green-900 mb-1">No Issues Detected</h4>
              <p className="text-sm text-green-800">This job description looks great and is ready to publish!</p>
            </div>
          )}
        </div>

        {/* 4. Supporting Intelligence */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Supporting Intelligence</h3>

          {!analysisSource ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              <p className="font-medium text-gray-800">Skills, match, and risk insights pending</p>
              <p className="mt-1 text-xs text-gray-500">
                This section will repopulate from the latest analysis once it matches your current job
                description.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Required Skills</h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {analysisSource.requiredSkills?.length || 0}
                    </span>
                  </div>
                  {analysisSource.requiredSkills && analysisSource.requiredSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analysisSource.requiredSkills.map((skill: string, index: number) => (
                        <span
                          key={`${skill}-${index}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No required skills specified</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Key Responsibilities</h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {analysisSource.keyResponsibilities?.length || 0}
                    </span>
                  </div>
                  {analysisSource.keyResponsibilities &&
                  analysisSource.keyResponsibilities.length > 0 ? (
                    <ul className="space-y-2">
                      {analysisSource.keyResponsibilities.map((resp: string, index: number) => (
                        <li
                          key={`${resp.slice(0, 48)}-${index}`}
                          className="text-sm text-gray-700 flex items-start"
                        >
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                          {resp}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No responsibilities specified</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Candidate Match Prediction</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Match Quality</span>
                      <span className="text-sm font-medium text-gray-900">Good Fit</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Expected Applicants</span>
                      <span className="text-sm font-medium text-gray-900">25-40</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time to Fill</span>
                      <span className="text-sm font-medium text-gray-900">2-3 weeks</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Hiring Risks</h4>
                  <div className="space-y-2">
                    {allIssues.length > 0 ? (
                      <>
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">
                              Unclear requirements may attract unqualified candidates
                            </p>
                          </div>
                        </div>
                        {allIssues.length > 2 && (
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-700">
                                Multiple issues may extend hiring timeline
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-700">Low risk - well-defined position</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Information - Collapsible */}
      {showDebugInfo && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-6 py-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Raw Analysis Data</h3>
              {!analysisSource && (
                <p className="text-xs text-amber-800 mb-2">
                  Stored extraction below is not used as the current UI (status{' '}
                  {job?.jdAnalysisStatus ?? 'unknown'}) — shown for debugging only.
                </p>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">Click to expand extraction data</summary>
                <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                  {JSON.stringify(jdExtraction, null, 2)}
                </pre>
              </details>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Job Metadata</h3>
              <div className="bg-white border border-gray-200 rounded p-3 text-xs space-y-1">
                <div><strong>Job ID:</strong> {jobId || 'N/A'}</div>
                <div><strong>Prompt Version:</strong> {promptVersion || 'N/A'}</div>
                <div><strong>Analyzed At:</strong> {analyzedAt || 'N/A'}</div>
                <div><strong>Job Updated:</strong> {job?.updatedAt || 'N/A'}</div>
                <div><strong>Freshness:</strong> {getFreshnessState()}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis Metrics</h3>
              <div className="bg-white border border-gray-200 rounded p-3 text-xs space-y-1">
                <div>
                  <strong>Quality Score (UI):</strong>{' '}
                  {score !== null ? `${score}/100` : '— (pending current analysis)'}
                </div>
                <div>
                  <strong>Active Issues:</strong> {analysisSource ? `${allIssues.length} / ${totalIssues}` : '—'}
                </div>
                {resolvedCount > 0 && (
                  <div><strong>Resolved Issues:</strong> {resolvedCount}</div>
                )}
                <div><strong>Ambiguities:</strong> {jdExtraction.ambiguities?.length || 0}</div>
                <div><strong>Missing Criteria:</strong> {jdExtraction.missingCriteria?.length || 0}</div>
                <div><strong>Unrealistic Expectations:</strong> {jdExtraction.unrealisticExpectations?.length || 0}</div>
                <div><strong>Required Skills:</strong> {jdExtraction.requiredSkills?.length || 0}</div>
                <div><strong>Key Responsibilities:</strong> {jdExtraction.keyResponsibilities?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full JD refine — review (same overlay pattern as suggestion / bulk modals) */}
      {refineReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refine-jd-review-title"
          >
            <div className="shrink-0 border-b px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="refine-jd-review-title" className="text-xl font-semibold text-gray-900">
                    Review refined job description
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Compare the original posting with the recruiter-facing refined version. Nothing is saved
                    until you choose <span className="font-medium text-gray-800">Apply Refined JD</span>.
                    {refineReview.requestId ? (
                      <span className="block mt-1 text-xs text-gray-500">
                        Request ID: {refineReview.requestId}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRefineReview}
                  disabled={isApplyingRefinedJd}
                  className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Cancel and close review"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="flex min-h-0 flex-col">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Original job description</h3>
                  <div
                    className="min-h-[14rem] max-h-[min(48vh,32rem)] overflow-y-auto rounded-md border border-gray-200 bg-gray-50/80 p-4 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
                    tabIndex={0}
                  >
                    {refineReview.originalJD?.trim() ? refineReview.originalJD : '—'}
                  </div>
                </section>
                <section className="flex min-h-0 flex-col">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    Refined job description{' '}
                    <span className="font-normal text-gray-600">(recruiter-facing)</span>
                  </h3>
                  <div
                    className="min-h-[14rem] max-h-[min(48vh,32rem)] overflow-y-auto rounded-md border border-green-200 bg-green-50/50 p-4 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
                    tabIndex={0}
                  >
                    {refineReview.refinedJobDescription}
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-md border border-blue-100 bg-blue-50/90 p-4">
                <h3 className="text-sm font-semibold text-blue-950">Summary of improvements</h3>
                <p className="mt-2 text-sm leading-relaxed text-blue-950">{refineReview.summary}</p>
              </section>

              {refineReview.changesMade.length > 0 && (
                <section className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900">Changes made</h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
                    {refineReview.changesMade.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              {applyRefinedJdError && (
                <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <p className="text-sm text-red-800">{applyRefinedJdError}</p>
                  </div>
                </div>
              )}

              {refinedJdCopyFeedback && (
                <p
                  className={`mt-4 text-sm ${refinedJdCopyFeedback.startsWith('Copied') ? 'text-green-700' : 'text-amber-800'}`}
                  role="status"
                >
                  {refinedJdCopyFeedback}
                </p>
              )}
            </div>

            <div className="shrink-0 border-t bg-gray-50 px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRefineReview}
                  disabled={isApplyingRefinedJd}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyRefinedJd()}
                  disabled={isApplyingRefinedJd}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  Copy Refined JD
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyRefinedJd()}
                  disabled={isApplyingRefinedJd}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApplyingRefinedJd ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Applying…
                    </>
                  ) : (
                    'Apply Refined JD'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion Preview Modal */}
      {suggestionPreview.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Suggestion for: {suggestionPreview.issueTitle}
                </h2>
                <button
                  onClick={handleCancelPreview}
                  disabled={isApplyingSuggestion}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="p-4 bg-blue-50 border-blue-200 rounded-md">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Generated Suggestion</h3>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {suggestionPreview.suggestion}
                </p>
              </div>
              
              {/* Error Message */}
              {applyError && (
                <div className="mt-4 p-3 bg-red-50 border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{applyError}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={handleCancelPreview}
                disabled={isApplyingSuggestion}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToJobDescription}
                disabled={isApplyingSuggestion}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isApplyingSuggestion ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Add to Job Description'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {suggestionError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{suggestionError}</p>
              <button
                onClick={() => setSuggestionError(null)}
                className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Preview Modal */}
      {showBulkPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">All Fixes Preview</h2>
                <button
                  onClick={() => setShowBulkPreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {getGeneratedSuggestionsOnly().map(({ issue, issueKey, suggestion }) => (
                  <div key={issueKey} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            issue.type === 'ambiguity' ? 'bg-yellow-500' :
                            issue.type === 'unrealistic' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}></div>
                          <h4 className="text-sm font-semibold text-gray-900">{issue.title}</h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {issue.type}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            +{getProjectedScoreImprovement(issue).points} {getProjectedScoreImprovement(issue).category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFixes.has(issueKey)}
                          onChange={() => handleToggleFixSelection(issueKey)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRemoveSuggestion(issueKey)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remove suggestion"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-blue-900">Generated Fix</h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ready
                        </span>
                      </div>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedFixes.size} of {getGeneratedSuggestionsOnly().length} fixes selected
                </div>
                <div className="space-x-3">
                  <button
                    onClick={() => setShowBulkPreview(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplySelectedFixes}
                    disabled={selectedFixes.size === 0}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Selected Fixes ({selectedFixes.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-run Analysis Error */}
      {rerunError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{rerunError}</p>
              <button
                onClick={() => setRerunError(null)}
                className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
