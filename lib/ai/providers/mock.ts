/**
 * Mock AI Provider
 * Provides deterministic, schema-valid responses for development and testing
 */

import { 
  LLMProvider, 
  AnalyzeJDInput, 
  AnalyzeJDResult, 
  InterviewKitInput, 
  InterviewKitResult,
  CandidateSignalsInput,
  CandidateSignalsResult,
  ProviderConfig 
} from '../types';
import { createAIError, AIErrorCode } from '../errors';

export class MockProvider implements LLMProvider {
  name: string;
  private config: ProviderConfig;
  private currentJobTitle: string = '';
  private currentRawJD: string = '';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult> {
    this.checkFailureMode();
    
    // Store current job data for generic fallback
    this.currentJobTitle = input.jobTitle;
    this.currentRawJD = input.rawJD;
    
    // Start timing for diagnostics
    const startTime = Date.now();
    
    // Simulate processing time
    await this.delay(500 + Math.random() * 1000);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobTitle.toLowerCase();
    const rawJD = input.rawJD.toLowerCase();
    
    // Enhanced keyword detection from both title and JD content
    const frontendKeywords = ['react', 'frontend', 'ui', 'ux', 'javascript', 'typescript', 'html', 'css', 'next.js', 'vue', 'angular'];
    const backendKeywords = ['backend', 'api', 'server', 'node', 'express', 'database', 'sql', 'postgresql', 'mongodb'];
    const salesKeywords = ['sales', 'account', 'crm', 'lead', 'revenue', 'customer', 'client'];
    const dataKeywords = ['data analyst', 'data analytics', 'data scientist', 'business intelligence', 'bi analyst', 'data warehouse'];
    const productKeywords = ['product manager', 'product management', 'product owner', 'product lead', 'associate product manager', 'senior product manager', 'principal product manager', 'director of product', 'vp of product', 'roadmap', 'product vision', 'product metrics', 'market research', 'user feedback', 'stakeholder', 'cross-functional', 'engineering and design teams'];
    const marketingKeywords = ['marketing', 'marketing manager', 'digital marketing', 'content marketing', 'social media', 'brand', 'campaign', 'seo', 'sem', 'ppc', 'email marketing', 'marketing analytics'];
    const hrKeywords = ['hr', 'human resources', 'people operations', 'people ops', 'recruiting', 'talent acquisition', 'hr manager', 'people manager', 'recruiter', 'talent management', 'employee relations', 'compensation', 'benefits'];
    const engineeringManagerKeywords = ['engineering manager', 'engineering lead', 'tech lead', 'technical lead', 'team lead', 'engineering director', 'vp of engineering', 'cto', 'chief technology officer', 'software engineering manager'];
    const qaKeywords = ['qa', 'quality assurance', 'testing', 'test engineer', 'qa engineer', 'quality analyst', 'test automation', 'manual testing', 'selenium', 'cypress', 'testing framework'];
    
    const hasFrontendKeywords = frontendKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasBackendKeywords = backendKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasSalesKeywords = salesKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasDataKeywords = dataKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasProductKeywords = productKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasMarketingKeywords = marketingKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasHRKeywords = hrKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasEngineeringManagerKeywords = engineeringManagerKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasQAKeywords = qaKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    
    // Count keyword matches for diagnostics
    const keywordMatches = [
      hasFrontendKeywords, hasBackendKeywords, hasSalesKeywords, hasDataKeywords, 
      hasProductKeywords, hasMarketingKeywords, hasHRKeywords, 
      hasEngineeringManagerKeywords, hasQAKeywords
    ].filter(Boolean).length;
    
    // Determine response based on keywords or explicit scenario
    // Priority: explicit scenario > specific roles > general categories > generic
    let result: AnalyzeJDResult;
    let matchedScenario: string | undefined;
    let extractionMethod: 'scenario' | 'generic-fallback' | 'role-extraction' | 'weak-extraction';
    let usedGenericFallback = false;
    let roleTitleExtractionSuccess = false;
    let genericFallbackReason: string | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    if (scenario === 'generic') {
      result = this.getGenericJDResult();
      extractionMethod = 'generic-fallback';
      usedGenericFallback = true;
      genericFallbackReason = 'Explicit generic scenario requested';
      confidence = 'low';
    } else if (hasDataKeywords || scenario === 'data') {
      result = this.getDataAnalystJDResult();
      matchedScenario = 'data';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasProductKeywords || scenario === 'product') {
      result = this.getProductManagerJDResult();
      matchedScenario = 'product';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasMarketingKeywords || scenario === 'marketing') {
      result = this.getMarketingJDResult();
      matchedScenario = 'marketing';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasHRKeywords || scenario === 'hr') {
      result = this.getHRJDResult();
      matchedScenario = 'hr';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasEngineeringManagerKeywords || scenario === 'engineering-manager') {
      result = this.getEngineeringManagerJDResult();
      matchedScenario = 'engineering-manager';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasQAKeywords || scenario === 'qa') {
      result = this.getQAJDResult();
      matchedScenario = 'qa';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasFrontendKeywords || scenario === 'frontend') {
      result = this.getFrontendJDResult();
      matchedScenario = 'frontend';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasBackendKeywords || scenario === 'backend') {
      result = this.getBackendJDResult();
      matchedScenario = 'backend';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else if (hasSalesKeywords || scenario === 'sales') {
      result = this.getSalesJDResult();
      matchedScenario = 'sales';
      extractionMethod = 'scenario';
      confidence = 'high';
    } else {
      result = this.getGenericJDResult();
      extractionMethod = 'generic-fallback';
      usedGenericFallback = true;
      genericFallbackReason = 'No specific scenario keywords matched';
      confidence = keywordMatches > 0 ? 'medium' : 'low';
    }
    
    // Check if role title was extracted successfully
    roleTitleExtractionSuccess = !!result.roleTitle && result.roleTitle !== 'Professional';
    
    // Add development-only diagnostics
    const processingTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      result.__devDiagnostics = {
        activeProvider: this.name,
        matchedScenario,
        usedGenericFallback,
        roleTitleExtractionSuccess,
        extractionMethod,
        genericFallbackReason,
        keywordMatchCount: keywordMatches,
        processingTimeMs: processingTime,
        confidence
      };
    }
    
    return result;
  }

  async generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult> {
    this.checkFailureMode();
    
    // Simulate processing time
    await this.delay(800 + Math.random() * 1200);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobTitle.toLowerCase();
    
    if (jobTitle.includes('frontend') || jobTitle.includes('ui') || scenario === 'frontend') {
      return this.getFrontendInterviewKit();
    } else if (jobTitle.includes('backend') || jobTitle.includes('api') || scenario === 'backend') {
      return this.getBackendInterviewKit();
    } else if (jobTitle.includes('sales') || scenario === 'sales') {
      return this.getSalesInterviewKit();
    } else {
      return this.getGenericInterviewKit();
    }
  }

  async generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult> {
    this.checkFailureMode();
    
    // Simulate processing time
    await this.delay(600 + Math.random() * 800);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobRequirements.title.toLowerCase();
    
    if (jobTitle.includes('frontend') || jobTitle.includes('ui') || scenario === 'frontend') {
      return this.getFrontendCandidateSignals(input);
    } else if (jobTitle.includes('backend') || jobTitle.includes('api') || scenario === 'backend') {
      return this.getBackendCandidateSignals(input);
    } else if (jobTitle.includes('sales') || scenario === 'sales') {
      return this.getSalesCandidateSignals(input);
    } else {
      return this.getGenericCandidateSignals(input);
    }
  }

  private checkFailureMode(): void {
    const failureMode = (this.config as any).failureMode || 'none';
    const failureRate = (this.config as any).forceFailureRate || 0;
    
    if (failureMode === 'none' || (failureRate > 0 && Math.random() > failureRate)) {
      return; // No failure
    }
    
    switch (failureMode) {
      case 'timeout':
        throw createAIError(
          AIErrorCode.TIMEOUT,
          'Mock timeout error for testing',
          { provider: this.name, retryable: true }
        );
        
      case 'invalid_output':
        throw createAIError(
          AIErrorCode.OUTPUT_INVALID,
          'Mock invalid output error for testing',
          { provider: this.name }
        );
        
      case 'rate_limit':
        throw createAIError(
          AIErrorCode.RATE_LIMITED,
          'Mock rate limit error for testing',
          { provider: this.name, retryable: true }
        );
        
      default:
        return;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // JD Analysis Results
  private getFrontendJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Frontend Developer',
      requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git'],
      seniorityLevel: 'Senior',
      department: 'Engineering',
      estimatedSalary: {
        min: 120000,
        max: 180000,
        currency: 'USD'
      },
      experienceLevel: '5-8 years',
      keyResponsibilities: [
        'Develop and maintain responsive web applications',
        'Implement pixel-perfect UI components from Figma designs',
        'Optimize application performance and user experience',
        'Collaborate with backend team on API integration'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '5+ years of frontend development experience',
        'Strong knowledge of React, TypeScript, and modern CSS',
        'Experience with state management libraries (Redux, Zustand)'
      ],
      preferredQualifications: [
        'Experience with Next.js or similar frameworks',
        'Knowledge of state management libraries (Redux, Zustand)',
        'Familiarity with testing frameworks (Jest, React Testing Library)'
      ]
    };
  }

  private getBackendJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Backend Developer',
      requiredSkills: ['Node.js', 'TypeScript', 'Express', 'PostgreSQL', 'Docker', 'AWS'],
      seniorityLevel: 'Senior',
      department: 'Engineering',
      estimatedSalary: {
        min: 130000,
        max: 190000,
        currency: 'USD'
      },
      experienceLevel: '5-8 years',
      keyResponsibilities: [
        'Design and develop scalable backend services and APIs',
        'Implement database schemas and optimize query performance',
        'Ensure application security and data protection',
        'Collaborate with frontend team to integrate APIs'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '5+ years of backend development experience',
        'Strong knowledge of Node.js, TypeScript, and databases',
        'Experience with cloud platforms (AWS, GCP, or Azure)'
      ],
      preferredQualifications: [
        'Experience with microservices architecture',
        'Knowledge of containerization and orchestration',
        'Familiarity with CI/CD pipelines'
      ]
    };
  }

  private getSalesJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Sales Representative',
      requiredSkills: ['Sales', 'CRM', 'Communication', 'Negotiation', 'Lead Generation'],
      seniorityLevel: 'Mid-level',
      department: 'Sales',
      estimatedSalary: {
        min: 80000,
        max: 120000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Identify and qualify new sales opportunities',
        'Build and maintain relationships with clients',
        'Achieve and exceed sales targets',
        'Prepare and deliver sales presentations'
      ],
      qualifications: [
        'Bachelor\'s degree in Business or related field',
        '3+ years of sales experience',
        'Strong communication and negotiation skills',
        'Experience with CRM software'
      ],
      preferredQualifications: [
        'Experience in B2B sales',
        'Knowledge of industry',
        'Bilingual abilities'
      ]
    };
  }

  private getDataAnalystJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Data Analyst',
      requiredSkills: ['SQL', 'Excel', 'Tableau', 'Power BI', 'Python', 'Statistics', 'Data Visualization'],
      seniorityLevel: 'Mid-level',
      department: 'Data',
      estimatedSalary: {
        min: 85000,
        max: 130000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Analyze complex datasets to extract actionable insights',
        'Create and maintain dashboards and reports for stakeholders',
        'Collaborate with cross-functional teams to understand data needs',
        'Ensure data quality and integrity across all analyses'
      ],
      qualifications: [
        'Bachelor\'s degree in Data Science, Statistics, or related field',
        '3+ years of data analysis experience',
        'Strong SQL skills and experience with BI tools',
        'Knowledge of statistical analysis and data visualization techniques'
      ],
      preferredQualifications: [
        'Experience with Python or R for data analysis',
        'Familiarity with data warehousing concepts',
        'Knowledge of machine learning basics'
      ]
    };
  }

  private getGenericJDResult(): AnalyzeJDResult {
    // Smarter fallback: attempt lightweight extraction from job title and JD
    const jobTitle = this.currentJobTitle || '';
    const rawJD = this.currentRawJD || '';
    
    // Extract role title from job title when possible
    const extractedRoleTitle = this.extractRoleTitleFromJobTitle(jobTitle);
    
    // Extract lightweight skills from JD content
    const extractedSkills = this.extractSkillsFromJD(rawJD);
    
    // Extract lightweight responsibilities from JD content
    const extractedResponsibilities = this.extractResponsibilitiesFromJD(rawJD);
    
    // Infer seniority from job title
    const inferredSeniority = this.inferSeniorityFromJobTitle(jobTitle);
    
    // Infer department from job title and content
    const inferredDepartment = this.inferDepartmentFromJobTitle(jobTitle, rawJD);
    
    // Infer salary range based on role and seniority
    const inferredSalary = this.inferSalaryFromRole(extractedRoleTitle, inferredSeniority);
    
    return {
      roleTitle: extractedRoleTitle,                    // Extracted from job title
      requiredSkills: extractedSkills,                  // Mixed professional + extracted
      seniorityLevel: inferredSeniority,               // Inferred from job title
      department: inferredDepartment,                  // Inferred from content
      estimatedSalary: inferredSalary,                  // Role-appropriate
      experienceLevel: this.inferExperienceFromSeniority(inferredSeniority),
      keyResponsibilities: extractedResponsibilities,  // Extracted from JD
      qualifications: this.inferQualifications(extractedRoleTitle, inferredSeniority),
      preferredQualifications: this.inferPreferredQualifications(extractedRoleTitle, inferredSeniority),
      // Quality analysis for generic roles
      ambiguities: this.detectGenericAmbiguities(rawJD, jobTitle),
      unrealisticExpectations: this.detectGenericUnrealisticExpectations(rawJD, jobTitle),
      missingCriteria: this.detectGenericMissingCriteria(rawJD, jobTitle)
    };
  }

  // Generic quality analysis helper methods
  private detectGenericAmbiguities(rawJD: string, jobTitle: string): Array<{issue: string; suggestedClarification: string; evidence?: {content: string; source: string}}> {
    const ambiguities: Array<{issue: string; suggestedClarification: string; evidence?: {content: string; source: string}}> = [];
    const jd = rawJD.toLowerCase();
    const title = jobTitle.toLowerCase();
    
    // Check for vague role title
    if (title.includes('specialist') || title.includes('generalist') || title.includes('professional')) {
      ambiguities.push({
        issue: 'Vague role title',
        suggestedClarification: 'Specify the area of specialization (e.g., Marketing Specialist, Data Analyst)',
        evidence: {
          content: 'Role title is too general',
          source: 'job_title'
        }
      });
    }
    
    // Check for missing industry context
    if (!jd.includes('industry') && !jd.includes('sector') && !jd.includes('domain')) {
      ambiguities.push({
        issue: 'No industry context specified',
        suggestedClarification: 'Mention specific industry or sector (e.g., healthcare, finance, tech)',
        evidence: {
          content: 'Job description lacks industry context',
          source: 'job_description'
        }
      });
    }
    
    return ambiguities;
  }

  private detectGenericUnrealisticExpectations(rawJD: string, jobTitle: string): Array<{issue: string; whyUnrealistic: string; evidence?: {content: string; source: string}}> {
    const unrealistic: Array<{issue: string; whyUnrealistic: string; evidence?: {content: string; source: string}}> = [];
    const jd = rawJD.toLowerCase();
    
    // Check for excessive experience requirements
    const yearsMatch = jd.match(/(\d+)\+?\s*years?/);
    const years = yearsMatch ? parseInt(yearsMatch[1]) : 0;
    if (years > 10 && !title.includes('senior') && !title.includes('lead') && !title.includes('director')) {
      unrealistic.push({
        issue: 'High experience requirement for role level',
        whyUnrealistic: '10+ years may be excessive for non-senior roles',
        evidence: {
          content: `Found ${years} years requirement for non-senior role`,
          source: 'job_description'
        }
      });
    }
    
    // Check for "jack of all trades" expectations
    const skillCount = (jd.match(/skill|experience|ability/g) || []).length;
    if (skillCount > 15) {
      unrealistic.push({
        issue: 'Excessive skill requirements',
        whyUnrealistic: 'Listing too many skills may indicate unrealistic expectations',
        evidence: {
          content: `Found ${skillCount} different skill requirements`,
          source: 'job_description'
        }
      });
    }
    
    return unrealistic;
  }

  private detectGenericMissingCriteria(rawJD: string, jobTitle: string): Array<{missing: string; suggestedCriteria: string}> {
    const missing: Array<{missing: string; suggestedCriteria: string}> = [];
    const jd = rawJD.toLowerCase();
    
    // Check for missing performance expectations
    if (!jd.includes('perform') && !jd.includes('achieve') && !jd.includes('deliver') && !jd.includes('goal')) {
      missing.push({
        missing: 'No performance expectations defined',
        suggestedCriteria: 'Specify what success looks like and how performance will be measured'
      });
    }
    
    // Check for missing work environment details
    if (!jd.includes('office') && !jd.includes('remote') && !jd.includes('hybrid') && !jd.includes('location')) {
      missing.push({
        missing: 'No work environment specified',
        suggestedCriteria: 'Mention work arrangement (in-office, remote, hybrid)'
      });
    }
    
    return missing;
  }

  // Helper methods for smarter generic fallback
  private extractRoleTitleFromJobTitle(jobTitle: string): string {
    const title = jobTitle.toLowerCase().trim();
    
    // Remove common prefixes and suffixes
    const cleanTitle = title
      .replace(/^(senior|junior|lead|principal|staff|associate|mid-level|entry-level)\s+/i, '')
      .replace(/\s+(i|ii|iii|iv|v|vi)$/i, '')
      .replace(/\s+\([^)]*\)$/g, '') // Remove parenthetical info
      .trim();
    
    // Capitalize properly
    if (cleanTitle) {
      return cleanTitle.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Fallback to original title if cleaning removes everything
    return jobTitle || 'Professional';
  }

  private extractSkillsFromJD(rawJD: string): string[] {
    const jd = rawJD.toLowerCase();
    const skills: string[] = [];
    
    // Role-specific skill patterns (higher priority)
    const roleSpecificPatterns = [
      // Product Management
      { terms: ['product strategy', 'product roadmap', 'roadmapping'], skill: 'Product Strategy' },
      { terms: ['market research', 'market analysis'], skill: 'Market Research' },
      { terms: ['stakeholder', 'cross-functional'], skill: 'Stakeholder Management' },
      { terms: ['user feedback', 'customer feedback'], skill: 'User Feedback Analysis' },
      { terms: ['product metrics', 'analytics', 'data analysis'], skill: 'Product Metrics' },
      { terms: ['prioritization', 'feature prioritization'], skill: 'Prioritization' },
      
      // Technical
      { terms: ['javascript', 'react', 'typescript', 'node.js'], skill: 'JavaScript/React' },
      { terms: ['python', 'java', 'sql', 'database'], skill: 'Technical Skills' },
      { terms: ['api', 'backend', 'frontend', 'full-stack'], skill: 'Software Development' },
      
      // Marketing
      { terms: ['seo', 'sem', 'ppc', 'digital marketing'], skill: 'Digital Marketing' },
      { terms: ['content', 'social media', 'campaign'], skill: 'Marketing Campaigns' },
      
      // Sales
      { terms: ['crm', 'sales', 'account management'], skill: 'Sales Management' },
      
      // Data
      { terms: ['data science', 'machine learning', 'statistics'], skill: 'Data Science' },
      { terms: ['business intelligence', 'bi', 'data warehouse'], skill: 'Business Intelligence' },
      
      // HR
      { terms: ['recruiting', 'talent acquisition', 'hr'], skill: 'Talent Acquisition' },
      { terms: ['performance management', 'employee relations'], skill: 'HR Management' },
      
      // QA
      { terms: ['testing', 'qa', 'automation', 'selenium'], skill: 'Quality Assurance' }
    ];
    
    // Generic professional skills (lower priority)
    const genericPatterns = [
      { terms: ['communication', 'communicate'], skill: 'Communication' },
      { terms: ['teamwork', 'collaborate', 'collaboration'], skill: 'Collaboration' },
      { terms: ['problem solving', 'problem-solving'], skill: 'Problem Solving' },
      { terms: ['time management', 'deadline'], skill: 'Time Management' },
      { terms: ['leadership', 'lead'], skill: 'Leadership' }
    ];
    
    // First, extract role-specific skills
    roleSpecificPatterns.forEach(({ terms, skill }) => {
      if (terms.some(term => jd.includes(term))) {
        skills.push(skill);
      }
    });
    
    // Then add generic skills only if needed (to reach 4-8 total)
    if (skills.length < 4) {
      genericPatterns.forEach(({ terms, skill }) => {
        if (terms.some(term => jd.includes(term)) && skills.length < 8) {
          skills.push(skill);
        }
      });
    }
    
    // If still too few skills, add essential generic skills
    if (skills.length < 3) {
      const essentialSkills = ['Communication', 'Problem Solving', 'Collaboration'];
      essentialSkills.forEach(skill => {
        if (!skills.includes(skill) && skills.length < 6) {
          skills.push(skill);
        }
      });
    }
    
    return skills.slice(0, 8); // Limit to 8 skills max
  }

  private extractResponsibilitiesFromJD(rawJD: string): string[] {
    const jd = rawJD.toLowerCase();
    const responsibilities: string[] = [];
    
    // Look for responsibility indicators in JD
    const responsibilityPatterns = [
      { pattern: /responsible for (.+?)(?:\.|and|,|$)/, extract: (match: string) => match.trim() },
      { pattern: /will (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Will ${match.trim()}` },
      { pattern: /manage (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Manage ${match.trim()}` },
      { pattern: /develop (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Develop ${match.trim()}` },
      { pattern: /coordinate (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Coordinate ${match.trim()}` },
      { pattern: /support (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Support ${match.trim()}` },
      { pattern: /assist (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Assist ${match.trim()}` },
      { pattern: /ensure (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Ensure ${match.trim()}` },
      { pattern: /oversee (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Oversee ${match.trim()}` },
      { pattern: /lead (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Lead ${match.trim()}` },
      { pattern: /create (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Create ${match.trim()}` },
      { pattern: /implement (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Implement ${match.trim()}` },
      { pattern: /analyze (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Analyze ${match.trim()}` },
      { pattern: /design (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Design ${match.trim()}` },
      { pattern: /build (.+?)(?:\.|and|,|$)/, extract: (match: string) => `Build ${match.trim()}` }
    ];
    
    // Extract responsibilities from JD
    responsibilityPatterns.forEach(({ pattern, extract }) => {
      const matches = jd.match(pattern);
      if (matches && matches[1]) {
        const responsibility = extract(matches[1]);
        if (responsibility.length > 10 && responsibility.length < 100) {
          responsibilities.push(responsibility.charAt(0).toUpperCase() + responsibility.slice(1));
        }
      }
    });
    
    // If no responsibilities extracted, return empty array (no generic filler)
    // Better to have fewer high-confidence items than fake placeholders
    return responsibilities.slice(0, 5); // Limit to 5 responsibilities max
  }

  private inferSeniorityFromJobTitle(jobTitle: string): string {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('senior') || title.includes('sr.') || title.includes('lead') || title.includes('principal') || title.includes('director') || title.includes('vp') || title.includes('head')) {
      return 'Senior-level';
    } else if (title.includes('junior') || title.includes('jr.') || title.includes('associate') || title.includes('entry') || title.includes('intern')) {
      return 'Entry-level';
    } else if (title.includes('mid') || title.includes('staff')) {
      return 'Mid-level';
    } else {
      return 'Mid-level'; // Default assumption
    }
  }

  private inferDepartmentFromJobTitle(jobTitle: string, rawJD: string): string {
    const title = jobTitle.toLowerCase();
    const jd = rawJD.toLowerCase();
    const combined = title + ' ' + jd;
    
    if (combined.includes('product') || combined.includes('project')) {
      return 'Product';
    } else if (combined.includes('data') || combined.includes('analytics') || combined.includes('analyst')) {
      return 'Data';
    } else if (combined.includes('frontend') || combined.includes('ui') || combined.includes('design') || combined.includes('user interface')) {
      return 'Frontend';
    } else if (combined.includes('backend') || combined.includes('api') || combined.includes('server') || combined.includes('infrastructure')) {
      return 'Backend';
    } else if (combined.includes('sales') || combined.includes('account') || combined.includes('crm') || combined.includes('revenue')) {
      return 'Sales';
    } else if (combined.includes('market') || combined.includes('marketing') || combined.includes('brand') || combined.includes('campaign')) {
      return 'Marketing';
    } else if (combined.includes('hr') || combined.includes('human resources') || combined.includes('people') || combined.includes('recruit')) {
      return 'Human Resources';
    } else if (combined.includes('engineer') || combined.includes('development') || combined.includes('software') || combined.includes('technical')) {
      return 'Engineering';
    } else if (combined.includes('qa') || combined.includes('quality') || combined.includes('testing') || combined.includes('test')) {
      return 'Quality Assurance';
    } else if (combined.includes('finance') || combined.includes('accounting') || combined.includes('financial')) {
      return 'Finance';
    } else if (combined.includes('operation') || combined.includes('operational')) {
      return 'Operations';
    } else {
      return 'General';
    }
  }

  private inferSalaryFromRole(roleTitle: string, seniority: string): { min: number; max: number; currency: string } {
    const title = roleTitle.toLowerCase();
    let baseSalary = 60000;
    
    // Adjust base salary based on role type
    if (title.includes('manager') || title.includes('lead')) {
      baseSalary = 80000;
    } else if (title.includes('director') || title.includes('head')) {
      baseSalary = 120000;
    } else if (title.includes('engineer') || title.includes('developer')) {
      baseSalary = 75000;
    } else if (title.includes('analyst') || title.includes('specialist')) {
      baseSalary = 65000;
    } else if (title.includes('coordinator') || title.includes('assistant')) {
      baseSalary = 45000;
    }
    
    // Adjust for seniority
    let multiplier = 1;
    if (seniority === 'Senior-level') {
      multiplier = 1.5;
    } else if (seniority === 'Entry-level') {
      multiplier = 0.7;
    }
    
    const adjustedBase = Math.round(baseSalary * multiplier);
    
    return {
      min: Math.round(adjustedBase * 0.8),
      max: Math.round(adjustedBase * 1.3),
      currency: 'USD'
    };
  }

  private inferExperienceFromSeniority(seniority: string): string {
    switch (seniority) {
      case 'Entry-level':
        return '0-2 years';
      case 'Mid-level':
        return '3-5 years';
      case 'Senior-level':
        return '5-10 years';
      default:
        return '3-5 years';
    }
  }

  private inferQualifications(roleTitle: string, seniority: string): string[] {
    const qualifications: string[] = [];
    const title = roleTitle.toLowerCase();
    
    // Base qualifications
    qualifications.push('High school diploma or equivalent');
    
    // Add role-specific education requirements
    if (title.includes('engineer') || title.includes('developer') || title.includes('analyst') || title.includes('data')) {
      qualifications.push('Bachelor\'s degree in relevant field');
    } else if (title.includes('manager') || title.includes('director')) {
      qualifications.push('Bachelor\'s degree in Business or related field');
    }
    
    // Add experience requirements
    if (seniority === 'Entry-level') {
      qualifications.push('0-2 years of relevant experience');
    } else if (seniority === 'Mid-level') {
      qualifications.push('3-5 years of relevant experience');
    } else {
      qualifications.push('5+ years of relevant experience');
    }
    
    // Add skills requirement
    qualifications.push('Strong communication and interpersonal skills');
    
    return qualifications.slice(0, 4);
  }

  private inferPreferredQualifications(roleTitle: string, seniority: string): string[] {
    const qualifications: string[] = [];
    const title = roleTitle.toLowerCase();
    
    // Add advanced education
    if (title.includes('manager') || title.includes('director') || title.includes('lead')) {
      qualifications.push('Master\'s degree or advanced certification');
    } else {
      qualifications.push('Bachelor\'s degree in relevant field');
    }
    
    // Add specific certifications based on role
    if (title.includes('project')) {
      qualifications.push('PMP or similar certification');
    } else if (title.includes('data') || title.includes('analyst')) {
      qualifications.push('Analytical certification or training');
    } else if (title.includes('hr') || title.includes('human resources')) {
      qualifications.push('HR certification (PHR, SHRM-CP)');
    }
    
    // Add experience with tools
    qualifications.push('Experience with industry-standard tools');
    qualifications.push('Additional relevant certifications');
    
    return qualifications.slice(0, 3);
  }

  private getProductManagerJDResult(): AnalyzeJDResult {
    const rawJD = this.currentRawJD || '';
    const jobTitle = this.currentJobTitle || '';
    
    return {
      roleTitle: 'Product Manager',
      requiredSkills: [
        'Product Strategy',                    // Core PM skill
        'Roadmapping',                        // Core PM skill
        'Market Research',                     // Core PM skill
        'Stakeholder Management',              // Core PM skill
        'User Feedback Analysis',              // Core PM skill
        'Product Metrics',                    // Core PM skill
        'Cross-functional Collaboration',       // Core PM skill
        'Prioritization'                      // Core PM skill
      ],
      seniorityLevel: 'Mid-level',
      department: 'Product',
      estimatedSalary: {
        min: 90000,
        max: 140000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Define product vision and roadmap',
        'Conduct market research and competitive analysis',
        'Collaborate with engineering and design teams',
        'Analyze user feedback and product metrics',
        'Prioritize features based on business value and user needs',
        'Manage product lifecycle from conception to launch',
        'Present product updates to stakeholders',
        'Gather and document product requirements',
        'Coordinate cross-functional team efforts',
        'Monitor product performance and user satisfaction'
      ],
      qualifications: [
        'Bachelor\'s degree in Business, Engineering, or related field',
        '3+ years of product management experience',
        'Strong analytical and problem-solving skills',
        'Experience with agile development methodologies',
        'Excellent communication and presentation skills',
        'Proven track record of shipping successful products',
        'Experience with product analytics tools'
      ],
      preferredQualifications: [
        'MBA or advanced degree',
        'Product Management certification (PMP, CSPO)',
        'Experience with product analytics tools',
        'Background in technology or software development',
        'Experience managing cross-functional teams',
        'Familiarity with design thinking methodologies',
        'Experience with A/B testing and experimentation',
        'Knowledge of SaaS or B2B product management'
      ],
      // Quality analysis for Product Manager
      ambiguities: this.detectProductManagerAmbiguities(rawJD, jobTitle),
      unrealisticExpectations: this.detectProductManagerUnrealisticExpectations(rawJD, jobTitle),
      missingCriteria: this.detectProductManagerMissingCriteria(rawJD, jobTitle)
    };
  }

  // Quality analysis helper methods for Product Manager
  private detectProductManagerAmbiguities(rawJD: string, jobTitle: string): Array<{issue: string; suggestedClarification: string; evidence?: {content: string; source: string}}> {
    const ambiguities: Array<{issue: string; suggestedClarification: string; evidence?: {content: string; source: string}}> = [];
    const jd = rawJD.toLowerCase();
    const title = jobTitle.toLowerCase();
    
    // Check for missing product domain context
    if (!jd.includes('product') && !jd.includes('saas') && !jd.includes('b2b') && !jd.includes('b2c') && !jd.includes('enterprise') && !jd.includes('consumer')) {
      ambiguities.push({
        issue: 'No product domain context specified',
        suggestedClarification: 'Specify whether this is B2B, B2C, SaaS, or another product type',
        evidence: {
          content: 'Job description lacks product type context',
          source: 'job_description'
        }
      });
    }
    
    // Check for unclear ownership scope
    if (!jd.includes('own') && !jd.includes('responsible') && !jd.includes('manage') && !jd.includes('lead')) {
      ambiguities.push({
        issue: 'Unclear ownership scope',
        suggestedClarification: 'Clarify what aspects of product the person will own (features, roadmap, etc.)',
        evidence: {
          content: 'No clear ownership language found',
          source: 'job_description'
        }
      });
    }
    
    // Check for missing reporting structure
    if (!jd.includes('report') && !jd.includes('manager') && !jd.includes('director') && !jd.includes('vp')) {
      ambiguities.push({
        issue: 'No reporting line specified',
        suggestedClarification: 'Specify who this role reports to (Product Director, CPO, etc.)',
        evidence: {
          content: 'No reporting structure mentioned',
          source: 'job_description'
        }
      });
    }
    
    return ambiguities;
  }

  private detectProductManagerUnrealisticExpectations(rawJD: string, jobTitle: string): Array<{issue: string; whyUnrealistic: string; evidence?: {content: string; source: string}}> {
    const unrealistic: Array<{issue: string; whyUnrealistic: string; evidence?: {content: string; source: string}}> = [];
    const jd = rawJD.toLowerCase();
    
    // Check for unrealistic experience requirements
    const yearsMatch = jd.match(/(\d+)\+?\s*years?/);
    const years = yearsMatch ? parseInt(yearsMatch[1]) : 0;
    if (years > 15 && title.includes('product manager')) {
      unrealistic.push({
        issue: 'Excessive experience requirement',
        whyUnrealistic: '15+ years for Product Manager is unusually high and may limit qualified candidates',
        evidence: {
          content: `Found ${years} years requirement`,
          source: 'job_description'
        }
      });
    }
    
    // Check for unrealistic skill expectations
    if (jd.includes('expert') && jd.includes('all') && (jd.includes('programming') || jd.includes('coding'))) {
      unrealistic.push({
        issue: 'Unrealistic technical expertise expectation',
        whyUnrealistic: 'Product Manager typically focuses on strategy and coordination, not deep technical implementation',
        evidence: {
          content: 'Expecting expert-level programming skills for PM role',
          source: 'job_description'
        }
      });
    }
    
    // Check for tool/process expectations
    if (jd.includes('build') && jd.includes('everything') && (jd.includes('scratch') || jd.includes('ground up'))) {
      unrealistic.push({
        issue: 'Unrealistic "build everything" expectation',
        whyUnrealistic: 'Product Managers typically work with existing products and teams, not build from scratch',
        evidence: {
          content: 'Suggesting building entire product ecosystem single-handedly',
          source: 'job_description'
        }
      });
    }
    
    return unrealistic;
  }

  private detectProductManagerMissingCriteria(rawJD: string, jobTitle: string): Array<{missing: string; suggestedCriteria: string}> {
    const missing: Array<{missing: string; suggestedCriteria: string}> = [];
    const jd = rawJD.toLowerCase();
    
    // Check for missing success metrics
    if (!jd.includes('metric') && !jd.includes('kpi') && !jd.includes('success') && !jd.includes('measure')) {
      missing.push({
        missing: 'No success metrics defined',
        suggestedCriteria: 'Define what success looks like (user adoption, revenue impact, etc.)'
      });
    }
    
    // Check for missing tool/process details
    if (!jd.includes('tool') && !jd.includes('process') && !jd.includes('methodology') && !jd.includes('framework')) {
      missing.push({
        missing: 'No tools or methodologies specified',
        suggestedCriteria: 'Mention key tools (JIRA, Confluence) and methodologies (Agile, Scrum)'
      });
    }
    
    // Check for missing team size/scope
    if (!jd.includes('team') && !jd.includes('size') && !jd.includes('engineer') && !jd.includes('developer')) {
      missing.push({
        missing: 'No team scope defined',
        suggestedCriteria: 'Specify team size and composition (number of engineers, designers, etc.)'
      });
    }
    
    return missing;
  }

  private getMarketingJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Marketing Manager',
      requiredSkills: [
        'Digital Marketing Strategy',            // ✅ Core marketing skill
        'SEO/SEM Campaigns',                    // ✅ Core marketing skill
        'Content Marketing',                    // ✅ Core marketing skill
        'Social Media Management',              // ✅ Core marketing skill
        'Marketing Analytics',                  // ✅ Core marketing skill
        'Brand Management',                      // ✅ Core marketing skill
        'Lead Generation',                       // ✅ Core marketing skill
        'Budget Management'                      // ✅ Core marketing skill
      ],
      seniorityLevel: 'Mid-level',
      department: 'Marketing',
      estimatedSalary: {
        min: 65000,
        max: 95000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Develop and execute digital marketing strategies',
        'Manage SEO/SEM campaigns and paid advertising',
        'Create and oversee content marketing initiatives',
        'Analyze marketing metrics and campaign performance',
        'Manage social media presence and engagement',
        'Coordinate with sales team on lead generation',
        'Oversee marketing budget and resource allocation',
        'Conduct market research and competitor analysis',
        'Develop brand messaging and positioning'
      ],
      qualifications: [
        'Bachelor\'s degree in Marketing, Business, or related field',
        '3+ years of marketing experience',
        'Experience with digital marketing tools',
        'Strong analytical and communication skills',
        'Knowledge of SEO/SEM best practices',
        'Experience with marketing automation platforms'
      ],
      preferredQualifications: [
        'MBA or advanced degree',
        'Google Analytics certification',
        'HubSpot or Marketo certification',
        'Experience with B2B or SaaS marketing',
        'Background in graphic design or content creation',
        'Experience with paid advertising platforms',
        'Knowledge of marketing attribution models',
        'Bilingual or multilingual abilities'
      ]
    };
  }

  private getHRJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'HR Manager',
      requiredSkills: [
        'Talent Acquisition',                    // ✅ Core HR skill
        'Employee Relations',                    // ✅ Core HR skill
        'HR Compliance',                         // ✅ Core HR skill
        'Performance Management',                // ✅ Core HR skill
        'Compensation & Benefits',               // ✅ Core HR skill
        'HRIS Management',                       // ✅ Core HR skill
        'Training & Development',                 // ✅ Core HR skill
        'Workforce Planning'                     // ✅ Core HR skill
      ],
      seniorityLevel: 'Mid-level',
      department: 'Human Resources',
      estimatedSalary: {
        min: 70000,
        max: 100000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Oversee recruitment and talent acquisition processes',
        'Manage employee relations and conflict resolution',
        'Develop and implement HR policies and procedures',
        'Administer compensation and benefits programs',
        'Conduct performance reviews and management',
        'Coordinate training and development programs',
        'Ensure HR compliance with labor laws',
        'Manage employee onboarding and offboarding',
        'Analyze HR metrics and workforce data'
      ],
      qualifications: [
        'Bachelor\'s degree in Human Resources, Business, or related field',
        '3+ years of HR experience',
        'Knowledge of employment laws and regulations',
        'Experience with HRIS systems',
        'Strong interpersonal and communication skills',
        'HR certification (PHR, SHRM-CP) preferred'
      ],
      preferredQualifications: [
        'Master\'s degree in HR or Business Administration',
        'Senior HR certification (SPHR, SHRM-SCP)',
        'Experience with benefits administration',
        'Background in employee training and development',
        'Experience in a specific industry',
        'Knowledge of performance management systems',
        'Bilingual abilities',
        'Experience with union environments'
      ]
    };
  }

  private getEngineeringManagerJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Engineering Manager',
      requiredSkills: [
        'Team Leadership',                       // ✅ Core engineering management skill
        'Software Architecture',                 // ✅ Core engineering skill
        'Agile/Scrum Methodologies',             // ✅ Core engineering skill
        'Technical Strategy',                    // ✅ Core engineering skill
        'Code Review & Quality',                 // ✅ Core engineering skill
        'Cross-functional Collaboration',         // ✅ Core engineering skill
        'Resource Planning',                     // ✅ Core engineering skill
        'Mentoring & Coaching'                   // ✅ Core engineering skill
      ],
      seniorityLevel: 'Senior-level',
      department: 'Engineering',
      estimatedSalary: {
        min: 120000,
        max: 180000,
        currency: 'USD'
      },
      experienceLevel: '5-10 years',
      keyResponsibilities: [
        'Lead and manage engineering teams',
        'Oversee software development projects and delivery',
        'Ensure code quality and development best practices',
        'Mentor and develop team members',
        'Collaborate with product and design teams',
        'Drive technical architecture decisions',
        'Manage project timelines and resource allocation',
        'Implement agile development processes',
        'Review and approve technical designs',
        'Ensure system scalability and reliability'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '5+ years of software development experience',
        '2+ years of team leadership experience',
        'Strong programming skills in relevant languages',
        'Experience with system design and architecture',
        'Knowledge of software development best practices'
      ],
      preferredQualifications: [
        'Master\'s degree in Computer Science',
        'Experience managing multiple teams',
        'Background in startup or high-growth environments',
        'Experience with cloud technologies',
        'Knowledge of DevOps practices',
        'Experience with specific tech stack',
        'MBA or business background',
        'Open source contributions or technical writing'
      ]
    };
  }

  private getQAJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'QA Engineer',
      requiredSkills: [
        'Test Automation',                       // ✅ Core QA skill
        'Manual Testing',                         // ✅ Core QA skill
        'Quality Assurance Processes',            // ✅ Core QA skill
        'Test Case Design',                       // ✅ Core QA skill
        'Bug Tracking & Reporting',              // ✅ Core QA skill
        'API Testing',                            // ✅ Core QA skill
        'Performance Testing',                     // ✅ Core QA skill
        'Continuous Integration'                  // ✅ Core QA skill
      ],
      seniorityLevel: 'Mid-level',
      department: 'Engineering',
      estimatedSalary: {
        min: 75000,
        max: 115000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Design and execute test plans and test cases',
        'Perform manual and automated testing',
        'Identify, document, and track software defects',
        'Develop and maintain automated test scripts',
        'Conduct regression testing for new releases',
        'Perform API and integration testing',
        'Collaborate with developers on issue resolution',
        'Monitor and improve testing processes',
        'Ensure product quality and reliability'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '3+ years of QA testing experience',
        'Experience with test automation tools',
        'Strong analytical and problem-solving skills',
        'Knowledge of software development lifecycle',
        'Experience with bug tracking systems'
      ],
      preferredQualifications: [
        'ISTQB or other QA certification',
        'Experience with performance testing',
        'Background in software development',
        'Experience with specific testing frameworks',
        'Knowledge of security testing',
        'Experience with mobile testing',
        'Familiarity with CI/CD pipelines',
        'Experience with database testing'
      ]
    };
  }

  // Interview Kit Results
  private getFrontendInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'Explain the virtual DOM and how React uses it.',
          category: 'React Concepts',
          difficulty: 'medium',
          expectedAnswer: 'The virtual DOM is a JavaScript representation of the real DOM. React uses it to optimize rendering by calculating changes and updating only what has changed.'
        },
        {
          question: 'What are React Hooks and how do they work?',
          category: 'React Concepts',
          difficulty: 'medium',
          expectedAnswer: 'Hooks are functions that let you use state and other React features in functional components. They follow the Rules of Hooks and are called at the top level.'
        },
        {
          question: 'How would you optimize the performance of a React application?',
          category: 'Performance',
          difficulty: 'hard',
          expectedAnswer: 'Use React.memo, useMemo, useCallback, code splitting, lazy loading, and optimize re-renders.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about a time you had to learn a new technology quickly.',
          competency: 'Adaptability',
          followUp: ['What was your approach?', 'How did you ensure you learned effectively?']
        },
        {
          question: 'Describe a situation where you had conflicting requirements from different stakeholders.',
          competency: 'Conflict Resolution',
          followUp: ['How did you handle it?', 'What was the outcome?']
        }
      ],
      caseStudy: {
        title: 'Frontend Performance Optimization',
        description: 'A React application is loading slowly. Users report 5+ second load times. Analyze the potential causes and propose solutions.',
        timeLimit: 45,
        evaluationCriteria: [
          'Identification of performance bottlenecks',
          'Proposed optimization techniques',
          'Implementation approach',
          'Measurement and validation strategy'
        ]
      },
      interviewStructure: {
        totalDuration: 60,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Technical Assessment',
            duration: 30,
            description: 'Frontend development questions and coding exercise'
          },
          {
            name: 'Behavioral Questions',
            duration: 20,
            description: 'Past experience and situational questions'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  private getBackendInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'Explain RESTful API design principles.',
          category: 'API Design',
          difficulty: 'medium',
          expectedAnswer: 'REST uses HTTP methods, stateless communication, resource-based URLs, and standard status codes for scalable API design.'
        },
        {
          question: 'How would you handle database transactions in Node.js?',
          category: 'Database',
          difficulty: 'medium',
          expectedAnswer: 'Use transaction blocks, handle rollbacks on errors, ensure ACID properties, and use connection pooling.'
        },
        {
          question: 'Describe microservices architecture and when to use it.',
          category: 'Architecture',
          difficulty: 'hard',
          expectedAnswer: 'Microservices break applications into small, independent services. Use when you need scalability, independent deployment, and technology diversity.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about a time you had to scale a system.',
          competency: 'Technical Leadership',
          followUp: ['What challenges did you face?', 'How did you approach the solution?']
        },
        {
          question: 'Describe a situation where you had to debug a critical production issue.',
          competency: 'Problem Solving',
          followUp: ['What was your debugging process?', 'How did you prevent similar issues?']
        }
      ],
      caseStudy: {
        title: 'API Scalability Challenge',
        description: 'An e-commerce API is experiencing slow response times during peak traffic. Design a solution to improve performance.',
        timeLimit: 60,
        evaluationCriteria: [
          'Performance bottleneck identification',
          'Scalability solution design',
          'Implementation strategy',
          'Monitoring and maintenance approach'
        ]
      },
      interviewStructure: {
        totalDuration: 75,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'System Design',
            duration: 30,
            description: 'Architecture and scalability questions'
          },
          {
            name: 'Coding Exercise',
            duration: 25,
            description: 'Backend development practical exercise'
          },
          {
            name: 'Behavioral Questions',
            duration: 15,
            description: 'Experience and situational questions'
          }
        ]
      }
    };
  }

  private getSalesInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'How do you qualify leads effectively?',
          category: 'Sales Process',
          difficulty: 'medium',
          expectedAnswer: 'Use BANT criteria, assess budget, authority, need, and timeline, and prioritize based on fit and readiness.'
        },
        {
          question: 'Describe your approach to handling objections.',
          category: 'Sales Skills',
          difficulty: 'medium',
          expectedAnswer: 'Listen actively, acknowledge concerns, provide solutions, and use objection-handling frameworks like LAER.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about your most challenging sale.',
          competency: 'Resilience',
          followUp: ['What made it challenging?', 'How did you overcome the challenges?']
        },
        {
          question: 'How do you build relationships with clients?',
          competency: 'Relationship Building',
          followUp: ['What strategies do you use?', 'How do you maintain long-term relationships?']
        }
      ],
      interviewStructure: {
        totalDuration: 45,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Sales Experience',
            duration: 20,
            description: 'Past performance and sales approach'
          },
          {
            name: 'Role-play Exercise',
            duration: 15,
            description: 'Simulated sales scenario'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  private getGenericInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'What skills and experiences make you a good fit for this role?',
          category: 'General',
          difficulty: 'medium'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about your professional background.',
          competency: 'Experience',
          followUp: ['What are your key achievements?', 'What motivates you?']
        }
      ],
      interviewStructure: {
        totalDuration: 30,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Experience Discussion',
            duration: 20,
            description: 'Background and qualifications'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  // Candidate Signals Results
  private getFrontendCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 85,
      skillMatch: {
        score: 90,
        matchedSkills: ['React', 'TypeScript', 'JavaScript'],
        missingSkills: ['GraphQL'],
        additionalSkills: ['Vue.js', 'Angular']
      },
      experienceMatch: {
        score: 80,
        relevantYears: 4,
        levelMatch: true
      },
      educationMatch: {
        score: 85,
        relevantDegree: true
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'skills',
          description: 'Missing GraphQL experience which is preferred'
        }
      ],
      recommendation: 'yes',
      reasoning: 'Strong frontend skills with relevant React and TypeScript experience. Good educational background. Some gaps in modern frontend technologies but overall strong candidate.'
    };
  }

  private getBackendCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 78,
      skillMatch: {
        score: 85,
        matchedSkills: ['Node.js', 'TypeScript', 'PostgreSQL'],
        missingSkills: ['Kubernetes'],
        additionalSkills: ['MongoDB', 'Redis']
      },
      experienceMatch: {
        score: 75,
        relevantYears: 3,
        levelMatch: false
      },
      educationMatch: {
        score: 80,
        relevantDegree: true
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'experience',
          description: 'Less experience than required for senior role'
        },
        {
          type: 'low',
          category: 'skills',
          description: 'Missing container orchestration experience'
        }
      ],
      recommendation: 'maybe',
      reasoning: 'Good technical skills and relevant experience. May need more experience for senior-level responsibilities. Consider for mid-level position.'
    };
  }

  private getSalesCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 82,
      skillMatch: {
        score: 88,
        matchedSkills: ['Sales', 'CRM', 'Communication'],
        missingSkills: [],
        additionalSkills: ['Marketing', 'Customer Success']
      },
      experienceMatch: {
        score: 85,
        relevantYears: 4,
        levelMatch: true
      },
      educationMatch: {
        score: 75,
        relevantDegree: false
      },
      riskSignals: [
        {
          type: 'low',
          category: 'education',
          description: 'Degree not directly related to sales field'
        }
      ],
      recommendation: 'yes',
      reasoning: 'Strong sales background with relevant experience and skills. Good communication abilities. Education field not directly related but practical experience compensates.'
    };
  }

  private getGenericCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 70,
      skillMatch: {
        score: 75,
        matchedSkills: ['Communication', 'Teamwork'],
        missingSkills: ['Technical skills'],
        additionalSkills: ['Leadership']
      },
      experienceMatch: {
        score: 70,
        relevantYears: 3,
        levelMatch: true
      },
      educationMatch: {
        score: 65,
        relevantDegree: false
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'skills',
          description: 'Limited technical skills for the role'
        }
      ],
      recommendation: 'maybe',
      reasoning: 'Has good soft skills and some relevant experience. May need additional training or mentorship for technical aspects of the role.'
    };
  }
}
