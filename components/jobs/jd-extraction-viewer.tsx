import React from 'react';

interface JDExtractionViewerProps {
  extraction: any;
  analyzedAt?: string | null;
  promptVersion?: string | null;
}

export const JDExtractionViewer: React.FC<JDExtractionViewerProps> = ({
  extraction,
  analyzedAt,
  promptVersion
}) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

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
      </div>
    </div>
  );
};
