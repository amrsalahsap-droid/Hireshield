import React, { useState } from 'react';

interface JDExtractionViewerProps {
  extraction: any;
  analyzedAt?: string | null;
  promptVersion?: string | null;
  jobId?: string | null;
  onReRunAnalysis?: () => void;
  onEditJob?: () => void;
}

export const JDExtractionViewer: React.FC<JDExtractionViewerProps> = ({
  extraction,
  analyzedAt,
  promptVersion,
  jobId,
  onReRunAnalysis,
  onEditJob
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showRawAnalysis, setShowRawAnalysis] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Quality assessment helper functions
  const getQualityScore = (extraction: any): number => {
    let score = 100;
    
    // Deduct points for missing key elements
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) score -= 30;
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length === 0) score -= 25;
    if (!extraction.seniorityLevel || extraction.seniorityLevel === 'Mid-level') score -= 10;
    if (!extraction.experienceLevel) score -= 10;
    
    // Deduct points for quality issues
    if (extraction.ambiguities && extraction.ambiguities.length > 0) score -= extraction.ambiguities.length * 5;
    if (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) score -= extraction.unrealisticExpectations.length * 10;
    if (extraction.missingCriteria && extraction.missingCriteria.length > 0) score -= extraction.missingCriteria.length * 8;
    
    return Math.max(0, score);
  };

  const getQualityLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBreakdown = (extraction: any) => {
    // Calculate individual category scores based on existing logic
    let clarityScore = 100;
    let completenessScore = 100;
    let skillsScore = 100;
    let responsibilityScore = 100;

    // Clarity: affected by ambiguities
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      clarityScore -= extraction.ambiguities.length * 10;
    }

    // Completeness: affected by missing criteria
    if (extraction.missingCriteria && extraction.missingCriteria.length > 0) {
      completenessScore -= extraction.missingCriteria.length * 15;
    }

    // Skills Definition: affected by missing required skills
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      skillsScore -= 60; // Major penalty
    } else if (extraction.requiredSkills.length < 3) {
      skillsScore -= 20; // Minor penalty for few skills
    }

    // Responsibility Detail: affected by missing key responsibilities
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length === 0) {
      responsibilityScore -= 50; // Major penalty
    } else if (extraction.keyResponsibilities.length < 3) {
      responsibilityScore -= 15; // Minor penalty for few responsibilities
    }

    return {
      clarity: Math.max(0, clarityScore),
      completeness: Math.max(0, completenessScore),
      skills: Math.max(0, skillsScore),
      responsibility: Math.max(0, responsibilityScore)
    };
  };

  const getTopIssues = (extraction: any, limit: number = 3) => {
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
          priority: 1 // High priority
        });
      });
    }

    // Add missing criteria (medium priority)
    if (extraction.missingCriteria) {
      extraction.missingCriteria.forEach((criteria: any, index: number) => {
        issues.push({
          type: 'missing',
          title: criteria.missing || 'Missing criteria',
          priority: 2 // Medium priority
        });
      });
    }

    // Add unrealistic expectations (low priority)
    if (extraction.unrealisticExpectations) {
      extraction.unrealisticExpectations.forEach((expectation: any, index: number) => {
        issues.push({
          type: 'unrealistic',
          title: expectation.issue || 'Unrealistic expectation',
          priority: 3 // Lower priority
        });
      });
    }

    // Sort by priority and return top issues
    return issues
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);
  };

  const hasQualityIssues = (extraction: any): boolean => {
    return (
      (extraction.ambiguities && extraction.ambiguities.length > 0) ||
      (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) ||
      (extraction.missingCriteria && extraction.missingCriteria.length > 0) ||
      !extraction.requiredSkills ||
      extraction.requiredSkills.length === 0 ||
      !extraction.keyResponsibilities ||
      extraction.keyResponsibilities.length === 0
    );
  };

  const getImprovementSuggestions = (extraction: any): string[] => {
    const suggestions: string[] = [];
    
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      suggestions.push('Add specific required skills and qualifications');
    }
    
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length === 0) {
      suggestions.push('Include clear day-to-day responsibilities');
    }
    
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      suggestions.push('Clarify ambiguous requirements and responsibilities');
    }
    
    if (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) {
      suggestions.push('Review and adjust unrealistic experience or qualification requirements');
    }
    
    if (extraction.missingCriteria && extraction.missingCriteria.length > 0) {
      suggestions.push('Add missing important criteria like work environment, reporting structure, or success metrics');
    }
    
    if (!extraction.seniorityLevel || extraction.seniorityLevel === 'Mid-level') {
      suggestions.push('Specify the exact seniority level for better candidate matching');
    }
    
    return suggestions;
  };

  const getRecruiterSummary = (extraction: any): string => {
    const score = getQualityScore(extraction);
    const roleTitle = extraction.roleTitle || 'This role';
    const seniority = extraction.seniorityLevel || 'unspecified seniority';
    const skillsCount = extraction.requiredSkills?.length || 0;
    
    if (score >= 80) {
      return `${roleTitle} (${seniority}) is well-structured with ${skillsCount} key skills and clear responsibilities. This JD should attract qualified candidates effectively.`;
    } else if (score >= 60) {
      return `${roleTitle} (${seniority}) has good foundation but needs improvements in clarity and completeness. Address the flagged issues to enhance candidate attraction.`;
    } else {
      return `${roleTitle} (${seniority}) needs significant improvements. Multiple issues detected that may confuse candidates or limit your applicant pool.`;
    }
  };

  const getRecommendedAction = (extraction: any): string => {
    const score = getQualityScore(extraction);
    const hasAmbiguities = extraction.ambiguities?.length > 0;
    const hasMissingCriteria = extraction.missingCriteria?.length > 0;
    
    if (score < 60) {
      return 'Improve Job Description';
    } else if (hasAmbiguities || hasMissingCriteria) {
      return 'Refine Job Description';
    } else {
      return 'Generate Interview Kit';
    }
  };

  // Unified issues helper
  const getUnifiedIssues = (extraction: any) => {
    const issues: Array<{
      type: 'ambiguity' | 'unrealistic' | 'missing';
      title: string;
      description: string;
      suggestion: string;
    }> = [];

    // Add ambiguities
    if (extraction.ambiguities) {
      extraction.ambiguities.forEach((ambiguity: any) => {
        issues.push({
          type: 'ambiguity',
          title: ambiguity.issue || 'Ambiguity detected',
          description: ambiguity.suggestedClarification || 'Not specified',
          suggestion: 'Clarify this requirement for better candidate understanding'
        });
      });
    }

    // Add unrealistic expectations
    if (extraction.unrealisticExpectations) {
      extraction.unrealisticExpectations.forEach((expectation: any) => {
        issues.push({
          type: 'unrealistic',
          title: expectation.issue || 'Unrealistic expectation',
          description: expectation.whyUnrealistic || 'Not specified',
          suggestion: 'Adjust this requirement to be more realistic for the role'
        });
      });
    }

    // Add missing criteria
    if (extraction.missingCriteria) {
      extraction.missingCriteria.forEach((criteria: any) => {
        issues.push({
          type: 'missing',
          title: criteria.missing || 'Missing criteria',
          description: criteria.suggestedCriteria || 'Not specified',
          suggestion: 'Add this information to complete the job description'
        });
      });
    }

    return issues;
  };

  const generateAnalysisSummary = () => {
    const summary = [];
    
    // Role Information
    summary.push('=== JOB ANALYSIS SUMMARY ===');
    summary.push(`Role Title: ${extraction.roleTitle || 'Not identified'}`);
    summary.push(`Seniority Level: ${extraction.seniorityLevel || 'Not specified'}`);
    summary.push(`Department: ${extraction.department || 'Not specified'}`);
    summary.push(`Experience Level: ${extraction.experienceLevel || 'Not specified'}`);
    
    // Salary
    if (extraction.estimatedSalary) {
      summary.push(`Estimated Salary: ${extraction.estimatedSalary.currency} ${extraction.estimatedSalary.min.toLocaleString()} - ${extraction.estimatedSalary.max.toLocaleString()}`);
    }
    
    summary.push('');
    
    // Skills
    summary.push('=== REQUIRED SKILLS ===');
    if (extraction.requiredSkills && extraction.requiredSkills.length > 0) {
      extraction.requiredSkills.forEach((skill: string, index: number) => {
        summary.push(`${index + 1}. ${skill}`);
      });
    } else {
      summary.push('None detected');
    }
    
    summary.push('');
    summary.push('=== PREFERRED SKILLS ===');
    if (extraction.preferredSkills && extraction.preferredSkills.length > 0) {
      extraction.preferredSkills.forEach((skill: string, index: number) => {
        summary.push(`${index + 1}. ${skill}`);
      });
    } else {
      summary.push('None detected');
    }
    
    summary.push('');
    
    // Responsibilities
    summary.push('=== KEY RESPONSIBILITIES ===');
    if (extraction.keyResponsibilities && extraction.keyResponsibilities.length > 0) {
      extraction.keyResponsibilities.forEach((responsibility: string, index: number) => {
        summary.push(`${index + 1}. ${responsibility}`);
      });
    } else {
      summary.push('None detected');
    }
    
    summary.push('');
    
    // Quality Analysis
    summary.push('=== QUALITY ANALYSIS ===');
    
    // Ambiguities
    summary.push('Ambiguities:');
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      extraction.ambiguities.forEach((ambiguity: any, index: number) => {
        summary.push(`  ${index + 1}. ${ambiguity.issue}`);
        summary.push(`     Suggested: ${ambiguity.suggestedClarification}`);
      });
    } else {
      summary.push('  None detected');
    }
    
    summary.push('');
    
    // Unrealistic Expectations
    summary.push('Unrealistic Expectations:');
    if (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) {
      extraction.unrealisticExpectations.forEach((expectation: any, index: number) => {
        summary.push(`  ${index + 1}. ${expectation.issue}`);
        summary.push(`     Why unrealistic: ${expectation.whyUnrealistic}`);
      });
    } else {
      summary.push('  None detected');
    }
    
    summary.push('');
    
    // Missing Criteria
    summary.push('Missing Criteria:');
    if (extraction.missingCriteria && extraction.missingCriteria.length > 0) {
      extraction.missingCriteria.forEach((criteria: any, index: number) => {
        summary.push(`  ${index + 1}. ${criteria.missing}`);
        summary.push(`     Suggested: ${criteria.suggestedCriteria}`);
      });
    } else {
      summary.push('  None detected');
    }
    
    summary.push('');
    summary.push(`Analysis Date: ${analyzedAt ? new Date(analyzedAt).toLocaleDateString() : 'Unknown'}`);
    if (promptVersion) {
      summary.push(`Analysis Version: ${promptVersion}`);
    }
    
    return summary.join('\n');
  };

  const handleCopyAnalysis = () => {
    const summary = generateAnalysisSummary();
    copyToClipboard(summary);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleReRunAnalysis = () => {
    if (onReRunAnalysis) {
      onReRunAnalysis();
    } else {
      // Fallback behavior if no handler provided
      window.location.reload();
    }
  };

  const handleEditJob = () => {
    if (onEditJob) {
      onEditJob();
    } else {
      // Fallback behavior if no handler provided
      window.location.href = '/jobs';
    }
  };

  const handleGenerateInterviewKit = () => {
    // Interview Kit generation not ready yet
    alert('Interview Kit generation will be enabled next.');
  };

  if (!extraction) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">📋</div>
          <p>No analysis data available</p>
        </div>
      </div>
    );
  }

  const EvidenceQuote: React.FC<{ evidence: any }> = ({ evidence }) => {
    if (!evidence) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded border-l-2 border-gray-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-mono italic">
              "{truncateText(evidence.content || '', 200)}"
            </p>
            {evidence.source && (
              <p className="text-xs text-gray-500 mt-1">
                — {evidence.source}
              </p>
            )}
          </div>
          {evidence.content && (
            <button
              onClick={() => copyToClipboard(evidence.content)}
              className="ml-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy quote"
            >
              📋
            </button>
          )}
        </div>
      </div>
    );
  };

  const score = getQualityScore(extraction);
  const qualityLabel = getQualityLabel(score);
  const qualityColor = getQualityColor(score);
  const scoreBreakdown = getScoreBreakdown(extraction);
  const topIssues = getTopIssues(extraction, 3);
  const allIssues = getUnifiedIssues(extraction);
  const displayedIssues = showAllIssues ? allIssues : allIssues.slice(0, 3);

  return (
    <div className="bg-white shadow rounded-lg">
      {/* 1. Top Summary Section */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">JD Analysis Results</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              {analyzedAt && (
                <span>Analyzed: {new Date(analyzedAt).toLocaleDateString()}</span>
              )}
              {promptVersion && (
                <span>Version: {promptVersion}</span>
              )}
            </div>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${qualityColor}`}>
            {score}/100 - {qualityLabel}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {getRecruiterSummary(extraction)}
          </p>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleEditJob}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {getRecommendedAction(extraction)}
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* 2. Role Profile Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Profile</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Role Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Role Title:</span>
                    <p className="text-sm font-medium text-gray-900">{extraction.roleTitle || 'Not identified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Seniority Level:</span>
                    <p className="text-sm font-medium text-gray-900">{extraction.seniorityLevel || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Department:</span>
                    <p className="text-sm font-medium text-gray-900">{extraction.department || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Experience Level:</span>
                    <p className="text-sm font-medium text-gray-900">{extraction.experienceLevel || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Compensation</h4>
                {extraction.estimatedSalary ? (
                  <div>
                    <span className="text-sm text-gray-600">Estimated Salary:</span>
                    <p className="text-sm font-medium text-gray-900">
                      {extraction.estimatedSalary.currency} {extraction.estimatedSalary.min.toLocaleString()} - {extraction.estimatedSalary.max.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not specified</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Required Skills ({extraction.requiredSkills?.length || 0})</h4>
              {extraction.requiredSkills && extraction.requiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extraction.requiredSkills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Preferred Skills ({extraction.preferredSkills?.length || 0})</h4>
              {extraction.preferredSkills && extraction.preferredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extraction.preferredSkills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Key Responsibilities ({extraction.keyResponsibilities?.length || 0})</h4>
              {extraction.keyResponsibilities && extraction.keyResponsibilities.length > 0 ? (
                <ul className="space-y-2">
                  {extraction.keyResponsibilities.map((responsibility: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-indigo-500 mr-2 mt-1">•</span>
                      <span className="break-words">{responsibility}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Issues Detected Section */}
        {allIssues.length > 0 && (
          <div id="issues-detected-section">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues Detected ({allIssues.length})</h3>
            <div className="space-y-3">
              {displayedIssues.map((issue, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{issue.title}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      issue.type === 'ambiguity' ? 'bg-yellow-100 text-yellow-800' :
                      issue.type === 'unrealistic' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                  <p className="text-sm text-gray-600 italic">{issue.suggestion}</p>
                </div>
              ))}
              
              {allIssues.length > 3 && (
                <button
                  onClick={() => setShowAllIssues(!showAllIssues)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showAllIssues ? 'Show less' : `Show ${allIssues.length - 3} more issues`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Quality Assessment Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Assessment</h3>
          <div className={`border rounded-lg p-6 ${qualityColor}`}>
            {/* Score Display */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">{score}</span>
                  <span className="text-lg text-gray-600 ml-2">/ 100</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${qualityColor} mt-2`}>
                  {qualityLabel}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700 mb-2">Recommended Next Action:</p>
                <button
                  onClick={handleEditJob}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  {score >= 80 ? 'Ready for Interview Kit' : 'Improve Job Description'}
                </button>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Score Breakdown</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">Clarity</span>
                      <span className="text-sm font-medium text-gray-900">{scoreBreakdown.clarity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(scoreBreakdown.clarity)}`}
                        style={{ width: `${scoreBreakdown.clarity}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">Completeness</span>
                      <span className="text-sm font-medium text-gray-900">{scoreBreakdown.completeness}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(scoreBreakdown.completeness)}`}
                        style={{ width: `${scoreBreakdown.completeness}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">Skills Definition</span>
                      <span className="text-sm font-medium text-gray-900">{scoreBreakdown.skills}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(scoreBreakdown.skills)}`}
                        style={{ width: `${scoreBreakdown.skills}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">Responsibility Detail</span>
                      <span className="text-sm font-medium text-gray-900">{scoreBreakdown.responsibility}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(scoreBreakdown.responsibility)}`}
                        style={{ width: `${scoreBreakdown.responsibility}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Issues */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Top Issues Detected</h4>
                {topIssues.length > 0 ? (
                  <div className="space-y-2">
                    {topIssues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-white bg-opacity-50 rounded-md">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          issue.type === 'ambiguity' ? 'bg-yellow-500' :
                          issue.type === 'unrealistic' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{issue.title}</p>
                          <p className="text-xs text-gray-600 mt-1 capitalize">{issue.type}</p>
                        </div>
                      </div>
                    ))}
                    {allIssues.length > 3 && (
                      <button
                        onClick={() => {
                          const issuesSection = document.getElementById('issues-detected-section');
                          if (issuesSection) {
                            issuesSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                      >
                        View all {allIssues.length} issues →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="w-8 h-8 mx-auto text-green-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-800">No critical issues detected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Improvement Guidance Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Improvement Guidance</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            {hasQualityIssues(extraction) ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Recommended Actions:</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    {getImprovementSuggestions(extraction).map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Recruiter Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Clear, specific requirements attract more qualified candidates
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Avoid jargon that might confuse potential applicants
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Include success metrics to help candidates understand expectations
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-sm text-blue-800">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  This job description looks comprehensive and well-structured!
                </div>
                <p className="mt-2">You're ready to start attracting qualified candidates for this role.</p>
              </div>
            )}
          </div>
        </div>

        {/* 5. Action Bar */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleEditJob}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Improve Job Description
              </button>

              <button
                onClick={handleGenerateInterviewKit}
                disabled
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed transition-colors"
                title="Interview Kit generation will be enabled next."
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Interview Kit
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleEditJob}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Job
              </button>

              <button
                onClick={handleReRunAnalysis}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-run Analysis
              </button>

              <button
                onClick={handleCopyAnalysis}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copySuccess ? 'Copied!' : 'Copy Analysis'}
              </button>
            </div>
          </div>

          {/* Action Status Messages */}
          {copySuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✓ Analysis summary copied to clipboard successfully!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Right Rail - Compact Metadata */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Analysis Status</h4>
          <button
            onClick={() => setShowRawAnalysis(!showRawAnalysis)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showRawAnalysis ? 'Hide' : 'Show'} Raw Analysis
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Status:</span>
            <p className="font-medium text-gray-900">Complete</p>
          </div>
          <div>
            <span className="text-gray-600">Analyzed:</span>
            <p className="font-medium text-gray-900">{analyzedAt ? new Date(analyzedAt).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-600">Issues:</span>
            <p className="font-medium text-gray-900">{allIssues.length}</p>
          </div>
          <div>
            <span className="text-gray-600">Quality:</span>
            <p className="font-medium text-gray-900">{score}/100</p>
          </div>
        </div>

        {showRawAnalysis && (
          <div className="mt-4 p-3 bg-white border border-gray-200 rounded-md">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Raw Analysis JSON (Development)</h5>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(extraction, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
