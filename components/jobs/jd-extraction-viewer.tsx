import React, { useState } from 'react';

interface JDExtractionViewerProps {
  extraction: any;
  job?: any; // For role title fallback
  analyzedAt?: string | null;
  promptVersion?: string | null;
  jobId?: string | null;
  analysisStatus?: string; // Analysis status from backend
  jobUpdatedAt?: string | null; // Job description last updated timestamp
  onReRunAnalysis?: () => void;
  onEditJob?: () => void;
}

export const JDExtractionViewer: React.FC<JDExtractionViewerProps> = ({
  extraction,
  job,
  analyzedAt,
  promptVersion,
  jobId,
  analysisStatus,
  jobUpdatedAt,
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

  // Freshness state helper functions
  const getFreshnessState = () => {
    if (!analyzedAt || !jobUpdatedAt) return 'unknown';
    
    const analysisTime = new Date(analyzedAt).getTime();
    const jobUpdateTime = new Date(jobUpdatedAt).getTime();
    
    if (jobUpdateTime > analysisTime) return 'outdated';
    return 'fresh';
  };

  const getAnalysisStatusDisplay = () => {
    if (!analysisStatus) return 'UNKNOWN';
    
    switch (analysisStatus.toUpperCase()) {
      case 'NOT_STARTED': return 'Not Started';
      case 'RUNNING': return 'Running';
      case 'DONE': return 'Completed';
      case 'FAILED': return 'Failed';
      default: return analysisStatus;
    }
  };

  const getFreshnessColor = () => {
    const state = getFreshnessState();
    switch (state) {
      case 'fresh': return 'green';
      case 'outdated': return 'amber';
      case 'unknown': return 'gray';
      default: return 'gray';
    }
  };

  const getFreshnessIcon = () => {
    const state = getFreshnessState();
    switch (state) {
      case 'fresh':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'outdated':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Role title helper with fallback
  const getRoleTitle = () => {
    if (extraction.roleTitle) return extraction.roleTitle;
    if (job?.title) return job.title;
    return null; // Return null instead of string for better handling
  };

  const getRoleTitleSource = () => {
    if (extraction.roleTitle) return 'extracted';
    if (job?.title) return 'job';
    return 'none';
  };

  const getRoleTitleDisplay = () => {
    const title = getRoleTitle();
    if (title) return title;
    return 'Role Title Unavailable'; // Softer message
  };

  // Improvement guidance helper functions
  const getHighestPriorityFix = (extraction: any): string => {
    const suggestions = getImprovementSuggestions(extraction);
    
    // Prioritize missing required skills or responsibilities as highest priority
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      return 'Add specific required skills and qualifications - this is the most critical missing element for candidate attraction.';
    }
    
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length === 0) {
      return 'Include clear day-to-day responsibilities - candidates need to understand what they will actually do.';
    }
    
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      return 'Clarify ambiguous requirements and responsibilities - unclear descriptions confuse qualified candidates.';
    }
    
    return suggestions[0] || 'Review and enhance job description clarity and completeness.';
  };

  const getImmediateFixes = (extraction: any): string[] => {
    const suggestions = getImprovementSuggestions(extraction);
    const immediateFixes: string[] = [];
    
    // Add critical fixes first
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      immediateFixes.push('Add specific required skills and qualifications');
    }
    
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length === 0) {
      immediateFixes.push('Include clear day-to-day responsibilities');
    }
    
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      immediateFixes.push('Clarify ambiguous requirements and responsibilities');
    }
    
    if (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) {
      immediateFixes.push('Review and adjust unrealistic experience or qualification requirements');
    }
    
    // Add other critical fixes (limit to 4 total)
    const otherFixes = suggestions.filter(s => !immediateFixes.includes(s)).slice(0, 4 - immediateFixes.length);
    return [...immediateFixes, ...otherFixes];
  };

  const getBestPracticeRecommendations = (extraction: any): string[] => {
    const recommendations: string[] = [];
    
    // Add best practice tips
    if (!extraction.seniorityLevel || extraction.seniorityLevel === 'Mid-level') {
      recommendations.push('Specify exact seniority level for better candidate matching');
    }
    
    if (extraction.missingCriteria && extraction.missingCriteria.length > 0) {
      recommendations.push('Add missing important criteria like work environment, reporting structure, or success metrics');
    }
    
    // Always include general best practices
    recommendations.push('Clear, specific requirements attract more qualified candidates');
    recommendations.push('Avoid jargon that might confuse potential applicants');
    recommendations.push('Include success metrics to help candidates understand expectations');
    
    return recommendations.slice(0, 4); // Limit to 4 recommendations
  };

  // Enhanced features helper functions
  const getRoleSummary = () => {
    const score = getQualityScore(extraction);
    const roleTitle = getRoleTitle();
    const seniority = extraction.seniorityLevel || 'unspecified';
    const skillsCount = extraction.requiredSkills?.length || 0;
    const responsibilitiesCount = extraction.keyResponsibilities?.length || 0;
    
    // Quality assessment
    let qualityDescription = '';
    if (score >= 80) {
      qualityDescription = 'well-structured and comprehensive';
    } else if (score >= 60) {
      qualityDescription = 'adequately detailed with room for improvement';
    } else {
      qualityDescription = 'needs significant enhancement to attract qualified candidates';
    }
    
    // Build summary
    const summary = `This ${seniority.toLowerCase()} ${roleTitle} position is ${qualityDescription}. `;
    
    if (skillsCount > 0 && responsibilitiesCount > 0) {
      return summary + `The role requires ${skillsCount} key skills and involves ${responsibilitiesCount} main responsibility areas.`;
    } else if (skillsCount > 0) {
      return summary + `The role specifies ${skillsCount} required skills but needs clearer responsibility definitions.`;
    } else if (responsibilitiesCount > 0) {
      return summary + `The role outlines ${responsibilitiesCount} responsibility areas but lacks specific skill requirements.`;
    } else {
      return summary + 'Consider adding specific skills and responsibilities to improve candidate attraction.';
    }
  };

  const getCandidateMatchPrediction = () => {
    const score = getQualityScore(extraction);
    const skillsCount = extraction.requiredSkills?.length || 0;
    const responsibilitiesCount = extraction.keyResponsibilities?.length || 0;
    const hasAmbiguities = extraction.ambiguities && extraction.ambiguities.length > 0;
    const hasUnrealistic = extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0;
    
    // Calculate match potential based on clarity and completeness
    let matchScore = 0;
    
    // Base score from quality
    matchScore += (score / 100) * 40; // 40% weight
    
    // Skills clarity (20% weight)
    if (skillsCount >= 5) matchScore += 20;
    else if (skillsCount >= 3) matchScore += 15;
    else if (skillsCount >= 1) matchScore += 10;
    
    // Responsibility clarity (20% weight)
    if (responsibilitiesCount >= 4) matchScore += 20;
    else if (responsibilitiesCount >= 2) matchScore += 15;
    else if (responsibilitiesCount >= 1) matchScore += 10;
    
    // Penalty for issues (20% weight)
    if (hasAmbiguities) matchScore -= 10;
    if (hasUnrealistic) matchScore -= 10;
    
    // Determine level
    if (matchScore >= 75) return { level: 'High', color: 'green', description: 'Clear requirements will attract well-qualified candidates' };
    if (matchScore >= 50) return { level: 'Medium', color: 'amber', description: 'Some clarification needed to improve candidate quality' };
    return { level: 'Low', color: 'red', description: 'Significant improvements needed to attract suitable candidates' };
  };

  const getHiringRisks = () => {
    const risks: Array<{
      type: string;
      severity: 'High' | 'Medium' | 'Low';
      description: string;
      mitigation: string;
    }> = [];
    
    // Seniority mismatch risk
    if (extraction.seniorityLevel === 'Mid-level' && (!extraction.experienceLevel || extraction.experienceLevel.includes('0'))) {
      risks.push({
        type: 'Seniority Mismatch',
        severity: 'High',
        description: 'Role specifies mid-level but lacks clear experience requirements',
        mitigation: 'Define specific years of experience and seniority expectations'
      });
    }
    
    // Technology ambiguity risk
    if (extraction.ambiguities && extraction.ambiguities.length > 0) {
      const techAmbiguities = extraction.ambiguities.filter((amb: any) => 
        amb.issue?.toLowerCase().includes('technology') || 
        amb.issue?.toLowerCase().includes('skill') || 
        amb.issue?.toLowerCase().includes('tool')
      );
      
      if (techAmbiguities.length > 0) {
        risks.push({
          type: 'Technology Ambiguity',
          severity: 'Medium',
          description: 'Unclear technology or skill requirements may confuse candidates',
          mitigation: 'Specify exact technologies, tools, and skill levels required'
        });
      }
    }
    
    // Vague responsibility scope risk
    if (!extraction.keyResponsibilities || extraction.keyResponsibilities.length < 2) {
      risks.push({
        type: 'Vague Responsibility Scope',
        severity: 'High',
        description: 'Insufficient detail about day-to-day responsibilities',
        mitigation: 'Add specific, actionable responsibility descriptions'
      });
    }
    
    // Unrealistic expectations risk
    if (extraction.unrealisticExpectations && extraction.unrealisticExpectations.length > 0) {
      risks.push({
        type: 'Unrealistic Expectations',
        severity: 'Medium',
        description: 'Requirements may be too demanding for the role level',
        mitigation: 'Review and adjust expectations to match market standards'
      });
    }
    
    // Missing critical skills risk
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      risks.push({
        type: 'Missing Critical Skills',
        severity: 'High',
        description: 'No required skills specified may attract unqualified candidates',
        mitigation: 'Define essential technical and soft skills for the role'
      });
    }
    
    return risks.slice(0, 4); // Limit to top 4 risks
  };

  // CTA logic helper functions
  const getPrimaryAction = () => {
    const score = getQualityScore(extraction);
    return score >= 80 ? 'generate-interview-kit' : 'improve-job-description';
  };

  const getInterviewKitDisabled = () => {
    const score = getQualityScore(extraction);
    return score < 80 || !extraction.requiredSkills || extraction.requiredSkills.length === 0;
  };

  const getInterviewKitTooltip = () => {
    const score = getQualityScore(extraction);
    if (score < 80) {
      return 'Interview Kit available once job description quality is improved';
    }
    if (!extraction.requiredSkills || extraction.requiredSkills.length === 0) {
      return 'Interview Kit available once required skills are added';
    }
    return 'Interview Kit generation coming soon';
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

  const getSuggestedFix = (issue: { type: string; title: string }): string => {
    const title = issue.title.toLowerCase();
    const type = issue.type;

    // Missing criteria fixes
    if (type === 'missing') {
      if (title.includes('salary') || title.includes('compensation')) {
        return "Include an estimated salary range to improve candidate targeting.";
      }
      if (title.includes('skills') || title.includes('technologies')) {
        return "Add a 'Technologies & Tools' section specifying the stack used in this role.";
      }
      if (title.includes('experience') || title.includes('seniority')) {
        return "Specify the expected years of experience and seniority level clearly.";
      }
      if (title.includes('responsibilities') || title.includes('duties')) {
        return "List key responsibilities and day-to-day tasks in bullet points.";
      }
      if (title.includes('qualifications') || title.includes('education')) {
        return "Clearly state required qualifications, education, and certifications.";
      }
      if (title.includes('industry') || title.includes('domain')) {
        return "Specify the industry or domain to provide context for the role.";
      }
      if (title.includes('location') || title.includes('remote') || title.includes('work environment')) {
        return "Clarify whether the role is remote, hybrid, or on-site with location details.";
      }
      if (title.includes('benefits') || title.includes('perks')) {
        return "Include information about benefits, perks, and company culture.";
      }
      if (title.includes('team') || title.includes('structure')) {
        return "Describe the team structure, reporting lines, and team size.";
      }
    }

    // Ambiguity fixes
    if (type === 'ambiguity') {
      if (title.includes('placeholder') || title.includes('nonsensical')) {
        return "Replace placeholder text with detailed, specific job information.";
      }
      if (title.includes('vague') || title.includes('unclear')) {
        return "Provide specific details and examples to clarify the ambiguous statements.";
      }
      if (title.includes('contradictory') || title.includes('conflicting')) {
        return "Review and resolve any contradictory requirements or statements.";
      }
    }

    // Unrealistic expectation fixes
    if (type === 'unrealistic') {
      if (title.includes('years') || title.includes('experience')) {
        return "Adjust experience requirements to be realistic for the role level.";
      }
      if (title.includes('skills') || title.includes('technologies')) {
        return "Balance the required skills to avoid asking for impossible combinations.";
      }
      if (title.includes('salary') || title.includes('compensation')) {
        return "Ensure compensation expectations align with market rates for the role.";
      }
    }

    // Generic fallbacks
    if (type === 'missing') {
      return "Add the missing information to provide a complete job description.";
    }
    if (type === 'ambiguity') {
      return "Clarify the ambiguous statements with specific details and examples.";
    }
    if (type === 'unrealistic') {
      return "Adjust the requirements to be more realistic and achievable.";
    }

    return "Review and improve this section of the job description.";
  };

  const handleGenerateSuggestion = async (issue: { type: string; title: string }) => {
    if (!jobId) {
      console.error('No job ID available for generating suggestion');
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/improve-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'cmm87bloy0000v9nvvzyt6aqn' // Demo org ID
        },
        body: JSON.stringify({
          jobId,
          issueType: issue.type,
          issueDescription: issue.title,
          rawJD: extraction?.rawJD || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Generated suggestion:', data.suggestion);
        
        // TODO: This could open a modal with the suggestion
        // For now, you could alert the suggestion or navigate to edit with pre-filled content
        alert(`Suggestion generated: ${data.suggestion}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate suggestion:', errorData.error);
        alert(`Failed to generate suggestion: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      alert('Network error occurred while generating suggestion');
    }
  };

  const handleIgnoreIssue = (issue: { type: string; title: string }) => {
    // For now, just log the action - this could update state to hide ignored issues
    console.log('Ignore issue:', issue);
    // TODO: This could add the issue to an ignored list
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
      // Safe fallback: no-op instead of broken navigation
      if (process.env.NODE_ENV === 'development') {
        console.warn('JDExtractionViewer: onEditJob handler not provided. Button disabled.');
      }
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
        {/* Freshness Indicator */}
        <div className={`mb-4 p-3 rounded-lg border ${
          getFreshnessState() === 'outdated' 
            ? 'bg-amber-50 border-amber-200' 
            : getFreshnessState() === 'fresh' 
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`inline-flex items-center ${
                getFreshnessState() === 'outdated' 
                  ? 'text-amber-600' 
                  : getFreshnessState() === 'fresh' 
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}>
                {getFreshnessIcon()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    getFreshnessState() === 'outdated' 
                      ? 'text-amber-900' 
                      : getFreshnessState() === 'fresh' 
                      ? 'text-green-900'
                      : 'text-gray-900'
                  }`}>
                    {getFreshnessState() === 'outdated' ? 'Outdated' : 
                     getFreshnessState() === 'fresh' ? 'Fresh' : 'Unknown'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    getAnalysisStatusDisplay() === 'Running' 
                      ? 'bg-blue-100 text-blue-800'
                      : getAnalysisStatusDisplay() === 'Failed'
                      ? 'bg-red-100 text-red-800'
                      : getAnalysisStatusDisplay() === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getAnalysisStatusDisplay()}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                  <span>Analysis: {formatDate(analyzedAt)}</span>
                  <span>Job: {formatDate(jobUpdatedAt)}</span>
                </div>
              </div>
            </div>
            
            {getFreshnessState() === 'outdated' && (
              <button
                onClick={handleReRunAnalysis}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
              >
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-run Analysis
              </button>
            )}
          </div>
          
          {getFreshnessState() === 'outdated' && (
            <div className="mt-2 text-xs text-amber-800 bg-amber-100 rounded-md p-2">
              <div className="flex items-start">
                <svg className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>
                  The job description changed after the last analysis. Re-run analysis to refresh results.
                </span>
              </div>
            </div>
          )}
        </div>

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
        
        {/* Role Summary */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">Role Summary</h4>
              <p className="text-sm text-indigo-800 leading-relaxed">
                {getRoleSummary()}
              </p>
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Role Profile</h3>
          
          {/* Core Role Identity - Visually Strong */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getRoleTitle() ? (
                    <h2 className="text-2xl font-bold text-gray-900">{getRoleTitle()}</h2>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h2 className="text-2xl font-bold text-gray-400">Role Title Unavailable</h2>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        No title data
                      </span>
                    </div>
                  )}
                  {getRoleTitleSource() === 'job' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      Using job title fallback
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {extraction.seniorityLevel && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {extraction.seniorityLevel}
                    </div>
                  )}
                  {extraction.department && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {extraction.department}
                    </div>
                  )}
                  {extraction.experienceLevel && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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

          {/* Skills Section - Grouped */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                <div className="text-center py-4">
                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-sm text-gray-500">No required skills detected</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Preferred Skills</h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {extraction.preferredSkills?.length || 0}
                </span>
              </div>
              {extraction.preferredSkills && extraction.preferredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extraction.preferredSkills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-50 text-green-800 border border-green-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <p className="text-sm text-gray-500">No preferred skills detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Key Responsibilities - Improved Readability */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Key Responsibilities</h4>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {extraction.keyResponsibilities?.length || 0}
              </span>
            </div>
            {extraction.keyResponsibilities && extraction.keyResponsibilities.length > 0 ? (
              <ul className="space-y-4">
                {extraction.keyResponsibilities.map((responsibility: string, index: number) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                      <span className="text-purple-600 text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 leading-relaxed">{responsibility}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4">
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-500">No key responsibilities detected</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Candidate Match Prediction */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Match Prediction</h3>
          <div className={`bg-white border rounded-lg p-5 ${
            getCandidateMatchPrediction().color === 'green' ? 'border-green-200' :
            getCandidateMatchPrediction().color === 'amber' ? 'border-amber-200' : 'border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  getCandidateMatchPrediction().color === 'green' ? 'bg-green-100' :
                  getCandidateMatchPrediction().color === 'amber' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <div className={`text-lg font-bold ${
                    getCandidateMatchPrediction().color === 'green' ? 'text-green-600' :
                    getCandidateMatchPrediction().color === 'amber' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {getCandidateMatchPrediction().level.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    getCandidateMatchPrediction().color === 'green' ? 'text-green-900' :
                    getCandidateMatchPrediction().color === 'amber' ? 'text-amber-900' : 'text-red-900'
                  }`}>
                    {getCandidateMatchPrediction().level}
                  </div>
                  <div className={`text-sm ${
                    getCandidateMatchPrediction().color === 'green' ? 'text-green-700' :
                    getCandidateMatchPrediction().color === 'amber' ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    Match Potential
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                getCandidateMatchPrediction().color === 'green' ? 'bg-green-100 text-green-800' :
                getCandidateMatchPrediction().color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {getCandidateMatchPrediction().level === 'High' ? 'Well-qualified candidates' :
                 getCandidateMatchPrediction().level === 'Medium' ? 'Some qualified candidates' : 'Limited qualified candidates'}
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${
              getCandidateMatchPrediction().color === 'green' ? 'text-green-800' :
              getCandidateMatchPrediction().color === 'amber' ? 'text-amber-800' : 'text-red-800'
            }`}>
              {getCandidateMatchPrediction().description}
            </p>
          </div>
        </div>

        {/* 4. Hiring Risks Detection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Risks Detection</h3>
          {getHiringRisks().length > 0 ? (
            <div className="space-y-3">
              {getHiringRisks().map((risk, index) => (
                <div key={index} className={`bg-white border rounded-lg p-4 ${
                  risk.severity === 'High' ? 'border-red-200' :
                  risk.severity === 'Medium' ? 'border-amber-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                      risk.severity === 'High' ? 'bg-red-100' :
                      risk.severity === 'Medium' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-xs font-bold ${
                        risk.severity === 'High' ? 'text-red-600' :
                        risk.severity === 'Medium' ? 'text-amber-600' : 'text-gray-600'
                      }`}>
                        {risk.severity.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className={`text-sm font-semibold ${
                          risk.severity === 'High' ? 'text-red-900' :
                          risk.severity === 'Medium' ? 'text-amber-900' : 'text-gray-900'
                        }`}>
                          {risk.type}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          risk.severity === 'High' ? 'bg-red-100 text-red-800' :
                          risk.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {risk.severity} Risk
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed mb-2 ${
                        risk.severity === 'High' ? 'text-red-800' :
                        risk.severity === 'Medium' ? 'text-amber-800' : 'text-gray-800'
                      }`}>
                        {risk.description}
                      </p>
                      <div className={`text-xs p-2 rounded-md ${
                        risk.severity === 'High' ? 'bg-red-50 text-red-700' :
                        risk.severity === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-green-900 mb-1">No Significant Hiring Risks Detected</h4>
                  <p className="text-sm text-green-800">
                    This job description appears to have clear requirements and reasonable expectations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Issues Detected Section */}
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
                  <div className="space-y-3">
                    {topIssues.map((issue, index) => (
                      <div key={index} className="p-4 bg-white bg-opacity-50 rounded-md border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            issue.type === 'ambiguity' ? 'bg-yellow-500' :
                            issue.type === 'unrealistic' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                            <p className="text-xs text-gray-600 mt-1 capitalize">{issue.type}</p>
                            
                            {/* Suggested Fix Section */}
                            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                              <p className="text-xs font-medium text-blue-900 mb-1">Suggested Fix</p>
                              <p className="text-xs text-blue-800">{getSuggestedFix(issue)}</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handleGenerateSuggestion(issue)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generate Suggestion
                              </button>
                              <button
                                onClick={() => handleIgnoreIssue(issue)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Ignore
                              </button>
                            </div>
                          </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Improvement Guidance</h3>
          
          {hasQualityIssues(extraction) ? (
            <div className="space-y-6">
              {/* Highest Priority Fix */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">Highest Priority Fix</h4>
                    <p className="text-xs text-red-700 mt-1">Address this immediately to improve candidate attraction</p>
                  </div>
                </div>
                <div className="bg-white rounded-md p-4 border border-red-100">
                  <p className="text-sm font-medium text-red-800 leading-relaxed">
                    {getHighestPriorityFix(extraction)}
                  </p>
                </div>
              </div>

              {/* Immediate Fixes */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-orange-900">Fix Now</h4>
                    <p className="text-xs text-orange-700 mt-1">Critical issues that may confuse candidates</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {getImmediateFixes(extraction).map((fix, index) => (
                    <div key={index} className="flex items-start space-x-3 bg-white rounded-md p-3 border border-orange-100">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 text-xs font-medium">{index + 1}</span>
                      </div>
                      <p className="text-sm text-orange-800 leading-relaxed">{fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best-Practice Recommendations */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">Improve Next</h4>
                    <p className="text-xs text-green-700 mt-1">Best practices to enhance job description quality</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {getBestPracticeRecommendations(extraction).map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 bg-white rounded-md p-3 border border-green-100">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                        <span className="text-green-600 text-xs font-medium">{index + 1}</span>
                      </div>
                      <p className="text-sm text-green-800 leading-relaxed">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-900 mb-2">Excellent Job Description</h4>
                  <p className="text-sm text-green-800 leading-relaxed">
                    This job description is comprehensive and well-structured! You're ready to start attracting qualified candidates for this role.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Action Bar */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3">
              {getPrimaryAction() === 'improve-job-description' ? (
                <button
                  onClick={handleEditJob}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Improve Job Description
                </button>
              ) : (
                <button
                  onClick={handleGenerateInterviewKit}
                  disabled={getInterviewKitDisabled()}
                  className={`inline-flex items-center px-6 py-3 text-sm font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg ${
                    getInterviewKitDisabled()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                  title={getInterviewKitTooltip()}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Interview Kit
                </button>
              )}
            </div>

            {/* Secondary Actions */}
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
