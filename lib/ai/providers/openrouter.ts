/**
 * OpenRouter Provider
 * Implements LLMProvider interface using OpenRouter API
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

interface OpenRouterConfig extends ProviderConfig {
  apiKey: string;
  baseUrl: string;
}

export class OpenRouterProvider implements LLMProvider {
  name: string;
  private config: OpenRouterConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.config = config as OpenRouterConfig;
  }

  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult> {
    const prompt = this.buildJDPrompt(input);
    const response = await this.callOpenRouter(prompt);
    return this.parseJDResponse(response);
  }

  async generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult> {
    const prompt = this.buildInterviewKitPrompt(input);
    const response = await this.callOpenRouter(prompt);
    return this.parseInterviewKitResponse(response);
  }

  async generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult> {
    const prompt = this.buildCandidateSignalsPrompt(input);
    const response = await this.callOpenRouter(prompt);
    return this.parseCandidateSignalsResponse(response);
  }

  private async callOpenRouter(prompt: string): Promise<any> {
    if (!this.config.apiKey) {
      throw createAIError(
        AIErrorCode.PROVIDER_NOT_CONFIGURED,
        'OpenRouter API key is not configured',
        { provider: this.name }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': 'https://hireshield.app',
          'X-Title': 'HireShield AI Service',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI assistant for HR and recruitment tasks. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw createAIError(
            AIErrorCode.RATE_LIMITED,
            'OpenRouter rate limit exceeded',
            { provider: this.name, retryable: true }
          );
        }
        
        throw createAIError(
          AIErrorCode.PROVIDER_ERROR,
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          { provider: this.name }
        );
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw createAIError(
          AIErrorCode.OUTPUT_INVALID,
          'Invalid response format from OpenRouter',
          { provider: this.name, details: data }
        );
      }

      return data.choices[0].message.content;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw createAIError(
          AIErrorCode.TIMEOUT,
          'OpenRouter request timeout',
          { provider: this.name, retryable: true }
        );
      }

      if (error && typeof error === 'object' && 'code' in error) {
        throw error; // Re-throw AI errors
      }

      throw createAIError(
        AIErrorCode.NETWORK_ERROR,
        `OpenRouter network error: ${error?.message || 'Unknown error'}`,
        { provider: this.name, retryable: true, details: error }
      );
    }
  }

  private buildJDPrompt(input: AnalyzeJDInput): string {
    return `
Analyze the following job description and extract key information in JSON format:

Job Title: ${input.jobTitle}

Job Description:
${input.rawJD}

Please return a JSON object with the following structure:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "seniorityLevel": "Junior|Mid-level|Senior|Lead|Principal",
  "department": "Engineering|Sales|Marketing|... (optional)",
  "estimatedSalary": {
    "min": 100000,
    "max": 150000,
    "currency": "USD"
  },
  "experienceLevel": "X-Y years",
  "keyResponsibilities": ["responsibility1", "responsibility2", ...],
  "qualifications": ["qualification1", "qualification2", ...],
  "preferredQualifications": ["preferred1", "preferred2", ...]
}

Focus on technical skills, experience requirements, and qualifications. Be realistic about salary ranges based on the role level and market.
    `.trim();
  }

  private buildInterviewKitPrompt(input: InterviewKitInput): string {
    return `
Generate a comprehensive interview kit for the following position:

Job Title: ${input.jobTitle}
Job Description: ${input.rawJD}
${input.extractedSkills ? `Required Skills: ${input.extractedSkills.join(', ')}` : ''}
${input.seniorityLevel ? `Seniority Level: ${input.seniorityLevel}` : ''}

Please return a JSON object with the following structure:
{
  "technicalQuestions": [
    {
      "question": "Specific technical question",
      "category": "React|Node.js|Database|...",
      "difficulty": "easy|medium|hard",
      "expectedAnswer": "Brief expected answer"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "Behavioral question",
      "competency": "Leadership|Teamwork|Problem-solving|...",
      "followUp": ["followUp1", "followUp2"]
    }
  ],
  "caseStudy": {
    "title": "Case study title",
    "description": "Detailed case study",
    "timeLimit": 45,
    "evaluationCriteria": ["criteria1", "criteria2"]
  },
  "interviewStructure": {
    "totalDuration": 60,
    "sections": [
      {
        "name": "Introduction",
        "duration": 5,
        "description": "Company and role overview"
      }
    ]
  }
}

Generate realistic, role-appropriate questions and scenarios.
    `.trim();
  }

  private buildCandidateSignalsPrompt(input: CandidateSignalsInput): string {
    return `
Analyze the following candidate against the job requirements and provide evaluation signals:

Candidate Profile:
Name: ${input.candidateProfile.name || 'Not specified'}
${input.candidateProfile.resume ? `Resume: ${input.candidateProfile.resume}` : ''}
${input.candidateProfile.experience ? `Experience: ${JSON.stringify(input.candidateProfile.experience, null, 2)}` : ''}
${input.candidateProfile.skills ? `Skills: ${input.candidateProfile.skills.join(', ')}` : ''}
${input.candidateProfile.education ? `Education: ${JSON.stringify(input.candidateProfile.education, null, 2)}` : ''}

Job Requirements:
Title: ${input.jobRequirements.title}
Description: ${input.jobRequirements.description}
Required Skills: ${input.jobRequirements.requiredSkills.join(', ')}
Experience Level: ${input.jobRequirements.experienceLevel}
${input.jobRequirements.seniorityLevel ? `Seniority: ${input.jobRequirements.seniorityLevel}` : ''}

Please return a JSON object with the following structure:
{
  "overallScore": 85,
  "skillMatch": {
    "score": 90,
    "matchedSkills": ["React", "TypeScript"],
    "missingSkills": ["GraphQL"],
    "additionalSkills": ["Vue.js"]
  },
  "experienceMatch": {
    "score": 80,
    "relevantYears": 4,
    "levelMatch": true
  },
  "educationMatch": {
    "score": 85,
    "relevantDegree": true
  },
  "riskSignals": [
    {
      "type": "high|medium|low",
      "category": "experience|skills|education|other",
      "description": "Specific concern"
    }
  ],
  "recommendation": "strong_yes|yes|maybe|no|strong_no",
  "reasoning": "Detailed explanation of the assessment"
}

Be objective and realistic in your assessment. Consider both strengths and potential concerns.
    `.trim();
  }

  private parseJDResponse(response: string): AnalyzeJDResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.requiredSkills || !Array.isArray(parsed.requiredSkills)) {
        throw createAIError(
          AIErrorCode.OUTPUT_INVALID,
          'Invalid requiredSkills in JD analysis response',
          { provider: this.name, details: { response, parsed } }
        );
      }

      return {
        requiredSkills: parsed.requiredSkills || [],
        seniorityLevel: parsed.seniorityLevel || 'Mid-level',
        department: parsed.department,
        estimatedSalary: parsed.estimatedSalary,
        experienceLevel: parsed.experienceLevel || '3-5 years',
        keyResponsibilities: parsed.keyResponsibilities || [],
        qualifications: parsed.qualifications || [],
        preferredQualifications: parsed.preferredQualifications || []
      };
    } catch (error: any) {
      throw createAIError(
        AIErrorCode.SCHEMA_VALIDATION_FAILED,
        `Failed to parse JD analysis response: ${error?.message || 'Unknown error'}`,
        { provider: this.name, details: { response, error } }
      );
    }
  }

  private parseInterviewKitResponse(response: string): InterviewKitResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        technicalQuestions: parsed.technicalQuestions || [],
        behavioralQuestions: parsed.behavioralQuestions || [],
        caseStudy: parsed.caseStudy,
        interviewStructure: parsed.interviewStructure || {
          totalDuration: 60,
          sections: []
        }
      };
    } catch (error: any) {
      throw createAIError(
        AIErrorCode.SCHEMA_VALIDATION_FAILED,
        `Failed to parse interview kit response: ${error?.message || 'Unknown error'}`,
        { provider: this.name, details: { response, error } }
      );
    }
  }

  private parseCandidateSignalsResponse(response: string): CandidateSignalsResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (typeof parsed.overallScore !== 'number' || parsed.overallScore < 0 || parsed.overallScore > 100) {
        throw createAIError(
          AIErrorCode.OUTPUT_INVALID,
          'Invalid overallScore in candidate signals response',
          { provider: this.name, details: { response, parsed } }
        );
      }

      return {
        overallScore: parsed.overallScore,
        skillMatch: parsed.skillMatch || { score: 0, matchedSkills: [], missingSkills: [], additionalSkills: [] },
        experienceMatch: parsed.experienceMatch || { score: 0, relevantYears: 0, levelMatch: false },
        educationMatch: parsed.educationMatch || { score: 0, relevantDegree: false },
        riskSignals: parsed.riskSignals || [],
        recommendation: parsed.recommendation || 'maybe',
        reasoning: parsed.reasoning || 'Unable to provide reasoning'
      };
    } catch (error: any) {
      throw createAIError(
        AIErrorCode.SCHEMA_VALIDATION_FAILED,
        `Failed to parse candidate signals response: ${error?.message || 'Unknown error'}`,
        { provider: this.name, details: { response, error } }
      );
    }
  }
}
