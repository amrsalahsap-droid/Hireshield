import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Users, AlertTriangle, Edit, RefreshCw, X, Plus, Target, ChevronDown, ChevronUp } from 'lucide-react';

interface JDExtractionViewerProps {
  extraction: any;
  job: any;
  analyzedAt?: string;
  promptVersion?: string;
  jobId?: string | null;
  onEditJob?: () => void;
  onAnalysisUpdate?: (newExtraction: any) => void;
}

export default function JDExtractionViewer({
  extraction,
  job,
  analyzedAt,
  promptVersion,
  jobId,
  onEditJob,
  onAnalysisUpdate
}: JDExtractionViewerProps) {
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

  // Helper functions (keeping existing implementations)
  const getQualityScore = (extraction: any): number => {
    if (!extraction) return 0;
    
    let score = 50; // Base score
    
    // Add points for completeness
    if (extraction.requiredSkills?.length > 0) score += 10;
    if (extraction.keyResponsibilities?.length > 0) score += 10;
    if (extraction.qualifications?.length > 0) score += 10;
    if (extraction.estimatedSalary) score += 10;
    if (extraction.department) score += 5;
    if (extraction.seniorityLevel) score += 5;
    
    // Deduct points for issues
    if (extraction.ambiguities?.length > 0) score -= extraction.ambiguities.length * 5;
    if (extraction.missingCriteria?.length > 0) score -= extraction.missingCriteria.length * 3;
    if (extraction.unrealisticExpectations?.length > 0) score -= extraction.unrealisticExpectations.length * 7;
    
    return Math.max(0, Math.min(100, score));
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

  const getRoleTitle = (): string => {
    return extraction?.roleTitle || job?.title || 'Unknown Role';
  };

  const getHighestPriorityFix = (issues: any[]): string => {
  if (!issues || issues.length === 0) return '';
  
  const topIssue = getHighestPriorityIssue(issues);
  if (!topIssue) return '';
  
  // Create a concise, actionable sentence
  const actionMap = {
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

  const getRecommendedAction = (extraction: any): string => {
    const score = getQualityScore(extraction);
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

  const getUnifiedIssues = (extraction: any) => {
    const issues: Array<{
      type: 'ambiguity' | 'unrealistic' | 'missing';
      title: string;
      priority: number;
    }> = [];

    // Add ambiguities (high priority)
    if (extraction.ambiguities) {
      extraction.ambiguities.forEach((ambiguity: any, index: number) => {
        issues.push({
          type: 'ambiguity',
          title: ambiguity.issue || 'Ambiguity detected',
          priority: 1
        });
      });
    }

    // Add missing criteria (medium priority)
    if (extraction.missingCriteria) {
      extraction.missingCriteria.forEach((criteria: any, index: number) => {
        issues.push({
          type: 'missing',
          title: criteria.missing || 'Missing criteria',
          priority: 2
        });
      });
    }

    // Add unrealistic expectations (low priority)
    if (extraction.unrealisticExpectations) {
      extraction.unrealisticExpectations.forEach((expectation: any, index: number) => {
        issues.push({
          type: 'unrealistic',
          title: expectation.issue || 'Unrealistic expectation',
          priority: 3
        });
      });
    }

    return issues.sort((a, b) => a.priority - b.priority);
  };

  const handleGenerateSuggestion = async (issue: any) => {
    if (!jobId) {
      console.error('[GENERATE_SUGGESTION][FAILED] No job ID available');
      setSuggestionError('No job ID available for generating suggestion');
      return;
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
          'x-org-id': 'cmmk1zo40000212ymhwgz0di8'
        },
        body: JSON.stringify({
          jobId,
          issueType: issue.type,
          issueDescription: issue.title,
          rawJD: job?.rawJD || ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate improvement');
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
      console.error('[GENERATE_SUGGESTION][FAILED]', { jobId, error });
      setSuggestionError('Failed to generate suggestion');
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
  };

  const handleAddToJobDescription = () => {
    console.log('[ADD_TO_JD]', suggestionPreview);
    alert('This would add the suggestion to the job description');
    handleCancelPreview();
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
    console.log('[IGNORE_ISSUE]', issue);
    // In a real implementation, this would mark the issue as ignored
  };

  const handleReRunAnalysis = async () => {
    console.log('[RE_RUN_ANALYSIS]', { jobId, isReRunningAnalysis });
    
    // Prevent multiple simultaneous reruns
    if (isReRunningAnalysis) {
      console.log('[RE_RUN_ANALYSIS] Already running, ignoring request');
      return;
    }
    
    // Clear any previous errors
    setRerunError(null);
    
    // Set running state
    setIsReRunningAnalysis(true);
    
    try {
      // Call JD analysis endpoint with force refresh
      const response = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceRefresh: true,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[RE_RUN_ANALYSIS][SUCCESS]', { jobId, responseData: data });
      
      // In a real implementation, this would update the parent component state
      // For now, we'll simulate the update by triggering a refresh
      if (onAnalysisUpdate) {
        onAnalysisUpdate(data.extraction);
      }
      
      // Clear any cached suggestions since analysis changed
      setGeneratedSuggestions(new Map());
      setSelectedFixes(new Set());
      
      // Show success feedback (optional)
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
    // In a real implementation, this would apply the selected fixes to the JD
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

  const handleImproveJobDescription = () => {
    console.log('[IMPROVE_JOB_DESCRIPTION]', { jobId, hasIssues: allIssues.length > 0 });
    
    // Call the existing edit handler but with enhanced context for JD editing
    if (onEditJob) {
      onEditJob();
    }
    
    // Attempt to focus on JD text area if available in the current context
    setTimeout(() => {
      // Try to find JD input/textarea elements in the page
      const jdSelectors = [
        'textarea[name*="description"]',
        'textarea[name*="job"]',
        'textarea[placeholder*="job"]',
        'textarea[placeholder*="description"]',
        'div[contenteditable="true"][data-placeholder*="job"]',
        '.job-description-field',
        '#job-description',
        '[data-testid="job-description"]'
      ];
      
      let jdElement = null;
      for (const selector of jdSelectors) {
        jdElement = document.querySelector(selector);
        if (jdElement) break;
      }
      
      if (jdElement) {
        // Scroll to JD field
        jdElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus on the JD field
        jdElement.focus();
        
        // Add visual highlight to draw attention
        jdElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          jdElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 3000);
        
        console.log('[IMPROVE_JOB_DESCRIPTION] Focused on JD field:', selector);
      } else {
        console.log('[IMPROVE_JOB_DESCRIPTION] JD field not found, falling back to general edit flow');
      }
    }, 500); // Small delay to ensure any modal/navigation completes
  };

  const storeGeneratedSuggestion = (issueKey: string, suggestion: string) => {
    setGeneratedSuggestions(prev => new Map(prev.set(issueKey, suggestion)));
  };

  if (!extraction) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">📋</div>
          <p>No analysis available</p>
        </div>
      </div>
    );
  }

  const score = getQualityScore(extraction);
  const qualityLabel = getQualityLabel(score);
  const qualityColor = getQualityColor(score);
  const allIssues = getUnifiedIssues(extraction);

  return (
    <div className="bg-white shadow rounded-lg">
      {/* 1. Decision Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${
                score >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                score >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {score}/100
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{qualityLabel}</h2>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(analyzedAt)}
                    </span>
                    {promptVersion && (
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
            
            {/* Improvement Guidance */}
            <div className="bg-white bg-opacity-70 rounded-lg p-4 mb-4">
              {allIssues.length > 0 ? (
                <div className="space-y-3">
                  {/* Highest Priority Fix */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Highest Priority Fix</h4>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {getHighestPriorityFix(allIssues)}
                    </p>
                  </div>

                  {/* Improve Next */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Improve Next</h4>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {getImproveNextSuggestions(extraction).map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Optional CTA */}
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      disabled
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-md cursor-not-allowed opacity-60"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Generate Improved JD Draft (Coming Soon)
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
              {allIssues.length > 0 ? (
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
                  {getRecommendedAction(extraction)}
                </button>
              )}
              
              {allIssues.length > 0 && (
                <button
                  onClick={handleImproveJobDescription}
                  className="inline-flex items-center px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Improve Job Description
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
              
              {(jobId && job && !isReRunningAnalysis) && (
                <button
                  onClick={handleReRunAnalysis}
                  disabled={isReRunningAnalysis}
                  className={`inline-flex items-center px-4 py-3 font-medium rounded-lg transition-colors ${
                    getFreshnessState() === 'outdated' 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                  } ${isReRunningAnalysis ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isReRunningAnalysis ? (
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
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* 2. Role Understanding */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Role Understanding</h3>
          
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">{getRoleTitle()}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {extraction.seniorityLevel && (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1.5 text-gray-400" />
                      {extraction.seniorityLevel}
                    </div>
                  )}
                  {extraction.department && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                      {extraction.department}
                    </div>
                  )}
                  {extraction.experienceLevel && (
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1.5 text-gray-400" />
                      {extraction.experienceLevel}
                    </div>
                  )}
                </div>
              </div>
              
              {extraction.estimatedSalary && extraction.estimatedSalary.min && extraction.estimatedSalary.max && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Estimated Salary</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {extraction.estimatedSalary.currency} {extraction.estimatedSalary.min.toLocaleString()} - {extraction.estimatedSalary.max.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Role Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Role Summary</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              This is a {extraction.seniorityLevel?.toLowerCase() || ''} position in the {extraction.department?.toLowerCase() || ''} department. 
              The role requires {extraction.experienceLevel?.toLowerCase() || ''} and involves key responsibilities including {extraction.keyResponsibilities?.slice(0, 2).join(', ') || 'various tasks'}.
            </p>
          </div>
        </div>

        {/* 3. Fix These Issues */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Fix These Issues</h3>
          
          {allIssues.length > 0 ? (
            <div className="space-y-3">
              {allIssues.map((issue, index) => (
                <div 
                  key={index} 
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
                      disabled={loadingSuggestions.has(`${issue.type}-${issue.title}`)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              ))}
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills & Responsibilities */}
            <div className="space-y-6">
              {/* Required Skills */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">Required Skills</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {extraction.requiredSkills?.length || 0}
                  </span>
                </div>
                {extraction.requiredSkills && extraction.requiredSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extraction.requiredSkills.map((skill: string, index: number) => (
                      <span
                        key={index}
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

              {/* Key Responsibilities */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">Key Responsibilities</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {extraction.keyResponsibilities?.length || 0}
                  </span>
                </div>
                {extraction.keyResponsibilities && extraction.keyResponsibilities.length > 0 ? (
                  <ul className="space-y-2">
                    {extraction.keyResponsibilities.map((resp: string, index: number) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
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

            {/* Analysis Details */}
            <div className="space-y-6">
              {/* Candidate Match Prediction */}
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

              {/* Hiring Risks */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Hiring Risks</h4>
                <div className="space-y-2">
                  {allIssues.length > 0 ? (
                    <>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-700">Unclear requirements may attract unqualified candidates</p>
                        </div>
                      </div>
                      {allIssues.length > 2 && (
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">Multiple issues may extend hiring timeline</p>
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
        </div>
      </div>

      {/* Debug Information - Collapsible */}
      {showDebugInfo && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-6 py-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Raw Analysis Data</h3>
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">Click to expand extraction data</summary>
                <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                  {JSON.stringify(extraction, null, 2)}
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
                <div><strong>Quality Score:</strong> {score}/100</div>
                <div><strong>Total Issues:</strong> {allIssues.length}</div>
                <div><strong>Ambiguities:</strong> {extraction.ambiguities?.length || 0}</div>
                <div><strong>Missing Criteria:</strong> {extraction.missingCriteria?.length || 0}</div>
                <div><strong>Unrealistic Expectations:</strong> {extraction.unrealisticExpectations?.length || 0}</div>
                <div><strong>Required Skills:</strong> {extraction.requiredSkills?.length || 0}</div>
                <div><strong>Key Responsibilities:</strong> {extraction.keyResponsibilities?.length || 0}</div>
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
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={handleCancelPreview}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToJobDescription}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Add to Job Description
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
