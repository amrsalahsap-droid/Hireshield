import { JDExtraction } from '@/lib/schemas/jd-extraction';

// Enhanced interface with optional new fields
export interface EnhancedJDExtraction extends JDExtraction {
  summary?: string;
  extractionQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: {
    roleTitle?: number;
    skills?: number;
    responsibilities?: number;
    overall?: number;
  };
}

// Helper functions for extraction quality assessment
export const getExtractionQuality = (extraction: EnhancedJDExtraction): 'HIGH' | 'MEDIUM' | 'LOW' => {
  // If backend provides quality, use it
  if (extraction.extractionQuality) {
    return extraction.extractionQuality;
  }

  // Derive quality from existing data
  const hasRoleTitle = extraction.roleTitle && extraction.roleTitle !== 'Not identified';
  const hasRequiredSkills = extraction.requiredSkills && extraction.requiredSkills.length > 0;
  const hasResponsibilities = extraction.keyResponsibilities && extraction.keyResponsibilities.length > 0;
  
  // Check for generic soft skills dominance
  const genericSkills = ['communication', 'teamwork', 'problem-solving', 'time management', 'leadership'];
  const genericSkillCount = extraction.requiredSkills?.filter(skill => 
    genericSkills.some(generic => skill.toLowerCase().includes(generic.toLowerCase()))
  ).length || 0;
  
  const isGenericHeavy = extraction.requiredSkills && 
    extraction.requiredSkills.length > 0 && 
    genericSkillCount / extraction.requiredSkills.length > 0.6;

  // Quality determination logic
  if (!hasRoleTitle || isGenericHeavy || !hasRequiredSkills || !hasResponsibilities) {
    return 'LOW';
  }
  
  if (hasRoleTitle && hasRequiredSkills && hasResponsibilities && !isGenericHeavy) {
    return 'HIGH';
  }
  
  return 'MEDIUM';
};

export const shouldShowLowQualityBanner = (extraction: EnhancedJDExtraction): boolean => {
  return getExtractionQuality(extraction) === 'LOW';
};

export const getAnalysisSummary = (extraction: EnhancedJDExtraction): string | null => {
  // If backend provides summary, use it
  if (extraction.summary) {
    return extraction.summary;
  }

  // Derive summary from existing data
  const quality = getExtractionQuality(extraction);
  const hasRoleTitle = extraction.roleTitle && extraction.roleTitle !== 'Not identified';
  const skillCount = extraction.requiredSkills?.length || 0;
  const responsibilityCount = extraction.keyResponsibilities?.length || 0;
  const seniority = extraction.seniorityLevel?.toLowerCase() || 'mid-level';

  if (quality === 'LOW') {
    return "This job description appears too generic for reliable hiring intelligence. Consider clarifying the role title, responsibilities, and role-specific requirements.";
  }

  // Extract key themes from skills and responsibilities for better summary
  const getRoleFocus = (): string => {
    const skills = extraction.requiredSkills || [];
    const responsibilities = extraction.keyResponsibilities || [];
    const allText = [...skills, ...responsibilities].join(' ').toLowerCase();
    
    // Data analysis focus
    if (allText.includes('data') || allText.includes('sql') || allText.includes('analytics') || allText.includes('reporting')) {
      return 'focused on data analysis, reporting, and structured data management';
    }
    
    // Frontend development focus
    if (allText.includes('react') || allText.includes('frontend') || allText.includes('ui') || allText.includes('javascript')) {
      return 'focused on frontend development and user interface design';
    }
    
    // Backend development focus
    if (allText.includes('backend') || allText.includes('api') || allText.includes('server') || allText.includes('database')) {
      return 'focused on backend development and API architecture';
    }
    
    // Sales focus
    if (allText.includes('sales') || allText.includes('crm') || allText.includes('customer') || allText.includes('revenue')) {
      return 'focused on sales and customer relationship management';
    }
    
    return 'with comprehensive responsibilities and requirements';
  };

  const roleFocus = getRoleFocus();

  if (quality === 'MEDIUM') {
    return hasRoleTitle 
      ? `This job describes a ${seniority} ${extraction.roleTitle} role ${roleFocus}, requiring ${skillCount} key skills and involving ${responsibilityCount} main responsibilities.`
      : `This position requires ${skillCount} key skills and involves ${responsibilityCount} main responsibilities ${roleFocus}, though the specific role title could not be confidently identified.`;
  }

  return hasRoleTitle
    ? `This job describes a ${seniority} ${extraction.roleTitle} role ${roleFocus}, with strong emphasis on ${skillCount} required skills and ${responsibilityCount} key responsibilities.`
    : `This position offers a role ${roleFocus}, requiring ${skillCount} specific skills and involving ${responsibilityCount} key responsibilities, though the exact title could not be confidently identified.`;
};

export const getEmptyStateCopy = (sectionName: string): string => {
  switch (sectionName) {
    case 'ambiguities':
      return "No major ambiguities were detected in the current description.";
    case 'unrealisticExpectations':
      return "No unrealistic expectations were identified.";
    case 'missingCriteria':
      return "No obvious missing criteria were detected.";
    case 'requiredSkills':
      return "No required skills detected.";
    case 'preferredSkills':
      return "No optional or preferred skills were identified in the current description.";
    case 'keyResponsibilities':
      return "No key responsibilities detected.";
    default:
      return "None detected";
  }
};

export const getQualityBadgeColor = (quality: 'HIGH' | 'MEDIUM' | 'LOW'): string => {
  switch (quality) {
    case 'HIGH':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'LOW':
      return 'bg-red-100 text-red-800 border-red-200';
  }
};

export const getSkillCategory = (skill: string): 'core' | 'supporting' | 'soft' => {
  const coreSkills = ['react', 'javascript', 'typescript', 'python', 'java', 'node.js', 'aws', 'docker', 'kubernetes', 'sql'];
  const softSkills = ['communication', 'teamwork', 'leadership', 'problem-solving', 'time management', 'collaboration'];
  
  const normalizedSkill = skill.toLowerCase();
  
  if (coreSkills.some(core => normalizedSkill.includes(core))) {
    return 'core';
  }
  
  if (softSkills.some(soft => normalizedSkill.includes(soft))) {
    return 'soft';
  }
  
  return 'supporting';
};

export const getSkillBadgeColor = (category: 'core' | 'supporting' | 'soft'): string => {
  switch (category) {
    case 'core':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'supporting':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'soft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const formatAnalysisForCopy = (extraction: EnhancedJDExtraction, quality: string, summary: string | null, analyzedAt?: string | null, promptVersion?: string | null): string => {
  return `
JD Analysis Results
==================
Role: ${extraction.roleTitle || 'Not identified'}
Seniority: ${extraction.seniorityLevel || 'Unknown'}
Quality: ${quality}

Required Skills (${extraction.requiredSkills?.length || 0}):
${extraction.requiredSkills?.map((skill: string) => `- ${skill}`).join('\n') || 'None'}

Preferred Skills (${extraction.preferredSkills?.length || 0}):
${extraction.preferredSkills?.map((skill: string) => `- ${skill}`).join('\n') || 'None'}

Key Responsibilities (${extraction.keyResponsibilities?.length || 0}):
${extraction.keyResponsibilities?.map((resp: string) => `- ${resp}`).join('\n') || 'None'}

${summary || ''}

Analysis Date: ${analyzedAt ? new Date(analyzedAt).toLocaleDateString() : 'Unknown'}
Version: ${promptVersion || 'Unknown'}
  `.trim();
};

export const copyAnalysisToClipboard = async (extraction: EnhancedJDExtraction, quality: string, summary: string | null, analyzedAt?: string | null, promptVersion?: string | null): Promise<boolean> => {
  const analysisText = formatAnalysisForCopy(extraction, quality, summary, analyzedAt, promptVersion);
  
  try {
    // Use modern clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(analysisText);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = analysisText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy analysis to clipboard:', error);
    return false;
  }
};
