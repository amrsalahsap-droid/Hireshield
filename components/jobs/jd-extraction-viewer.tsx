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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

  const AmbiguityCard: React.FC<{ ambiguity: any }> = ({ ambiguity }) => {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">
          {ambiguity.issue || 'Ambiguity detected'}
        </h4>
        <p className="text-sm text-yellow-700 mb-2">
          <strong>Suggested clarification:</strong> {ambiguity.suggestedClarification || 'Not specified'}
        </p>
        {ambiguity.evidence && <EvidenceQuote evidence={ambiguity.evidence} />}
      </div>
    );
  };

  const UnrealisticExpectationCard: React.FC<{ expectation: any }> = ({ expectation }) => {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-orange-800 mb-2">
          {expectation.issue || 'Unrealistic expectation'}
        </h4>
        <p className="text-sm text-orange-700 mb-2">
          <strong>Why unrealistic:</strong> {expectation.whyUnrealistic || 'Not specified'}
        </p>
        {expectation.evidence && <EvidenceQuote evidence={expectation.evidence} />}
      </div>
    );
  };

  const MissingCriteriaItem: React.FC<{ criteria: any }> = ({ criteria }) => {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-800 mb-2">
          {criteria.missing || 'Missing criteria'}
        </h4>
        <p className="text-sm text-red-700">
          <strong>Suggested criteria:</strong> {criteria.suggestedCriteria || 'Not specified'}
        </p>
        {criteria.evidence && <EvidenceQuote evidence={criteria.evidence} />}
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">JD Analysis Results</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {analyzedAt && (
              <span>Analyzed: {new Date(analyzedAt).toLocaleDateString()}</span>
            )}
            {promptVersion && (
              <span>Version: {promptVersion}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Role Header */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Role Title</h3>
              <p className="text-lg font-semibold text-gray-800">
                {extraction.roleTitle || 'Not identified'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Seniority Level</h3>
              <p className="text-lg font-semibold text-gray-800">
                {extraction.seniorityLevel || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Required Skills ({extraction.requiredSkills?.length || 0})
            </h3>
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

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Preferred Skills ({extraction.preferredSkills?.length || 0})
            </h3>
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
        </div>

        {/* Key Responsibilities */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Key Responsibilities ({extraction.keyResponsibilities?.length || 0})
          </h3>
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

        {/* Quality Analysis */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Quality Analysis</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ambiguities */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Ambiguities ({extraction.ambiguities?.length || 0})
              </h4>
              {extraction.ambiguities && extraction.ambiguities.length > 0 ? (
                <div className="space-y-3">
                  {extraction.ambiguities.map((ambiguity: any, index: number) => (
                    <AmbiguityCard key={index} ambiguity={ambiguity} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>

            {/* Unrealistic Expectations */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Unrealistic Expectations ({extraction.unrealisticExpectations?.length || 0})
              </h4>
              {extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0 ? (
                <div className="space-y-3">
                  {extraction.unrealisticExpectations.map((expectation: any, index: number) => (
                    <UnrealisticExpectationCard key={index} expectation={expectation} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>

            {/* Missing Criteria */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Missing Criteria ({extraction.missingCriteria?.length || 0})
              </h4>
              {extraction.missingCriteria && extraction.missingCriteria.length > 0 ? (
                <div className="space-y-3">
                  {extraction.missingCriteria.map((criteria: any, index: number) => (
                    <MissingCriteriaItem key={index} criteria={criteria} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              {/* Re-run Analysis */}
              <button
                onClick={handleReRunAnalysis}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-run Analysis
              </button>

              {/* Edit Job */}
              <button
                onClick={handleEditJob}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Job
              </button>

              {/* Copy Analysis */}
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

            {/* Generate Interview Kit */}
            <div className="relative group">
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
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 text-sm text-gray-600 bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Interview Kit generation will be enabled next.
                <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-gray-800 transform rotate-45"></div>
              </div>
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
    </div>
  );
};
