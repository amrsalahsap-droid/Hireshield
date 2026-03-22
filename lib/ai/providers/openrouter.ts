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

  async generateTargetedImprovement(input: any): Promise<any> {
    const prompt = this.buildTargetedImprovementPrompt(input);
    const response = await this.callOpenRouter(prompt);
    return this.parseTargetedImprovementResponse(response);
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
  "preferredSkills": ["preferred skill 1", "preferred skill 2", ...],
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
  "ambiguities": [
    {
      "issue": "Specific ambiguity identified",
      "suggestedClarification": "How to clarify this"
    }
  ],
  "unrealisticExpectations": [
    {
      "issue": "Unrealistic requirement",
      "whyUnrealistic": "Why this is unrealistic"
    }
  ],
  "missingCriteria": [
    {
      "missing": "Important missing element",
      "suggestedCriteria": "What should be included"
    }
  ]
}

Focus on technical skills, experience requirements, and qualifications. Be realistic about salary ranges based on role level and market.

QUALITY ANALYSIS REQUIREMENTS:
1. AMBIGUITIES: Look for unclear requirements, vague responsibilities, missing specifics
2. UNREALISTIC EXPECTATIONS: Identify unreasonable requirements or experience levels
3. MISSING CRITERIA: Identify important elements missing for this role type

For business roles (HR, Product, Finance, Sales), consider these common missing criteria:
- Work environment (remote/hybrid/office)
- Industry/domain context
- Ownership scope and decision-making authority
- Reporting line and team structure
- Success metrics and KPIs
- Tooling/system context
- Travel requirements
- Budget authority

Distinguish between:
- Required skills: Must-have skills for the role
- Preferred skills: Nice-to-have skills that would make a candidate stronger

Be conservative but helpful in quality analysis. Only identify issues that genuinely need clarification.
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
      
      // Development logging to debug preferred skills issue
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 OpenRouter Raw Response:', {
          rawPreferredQualifications: parsed.preferredQualifications,
          rawPreferredSkills: parsed.preferredSkills,
          hasPreferredQualifications: !!(parsed.preferredQualifications && parsed.preferredQualifications.length > 0),
          hasPreferredSkills: !!(parsed.preferredSkills && parsed.preferredSkills.length > 0),
          rawAmbiguities: parsed.ambiguities,
          rawUnrealisticExpectations: parsed.unrealisticExpectations,
          rawMissingCriteria: parsed.missingCriteria,
          hasAmbiguities: !!(parsed.ambiguities && parsed.ambiguities.length > 0),
          hasUnrealisticExpectations: !!(parsed.unrealisticExpectations && parsed.unrealisticExpectations.length > 0),
          hasMissingCriteria: !!(parsed.missingCriteria && parsed.missingCriteria.length > 0)
        });
      }
      
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
        preferredSkills: parsed.preferredQualifications || parsed.preferredSkills || [],
        seniorityLevel: parsed.seniorityLevel || 'Mid-level',
        department: parsed.department,
        estimatedSalary: parsed.estimatedSalary,
        experienceLevel: parsed.experienceLevel || '3-5 years',
        keyResponsibilities: parsed.keyResponsibilities || [],
        qualifications: parsed.qualifications || [],
        preferredQualifications: parsed.preferredQualifications || [],
        // Quality analysis fields
        ambiguities: parsed.ambiguities || [],
        unrealisticExpectations: parsed.unrealisticExpectations || [],
        missingCriteria: parsed.missingCriteria || []
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

  /**
   * Pick paste-ready output shape from issue type + title text (matches analyzer issue labels).
   */
  private inferTargetedImprovementOutputContract(
    issueType: string,
    issueDescription: string
  ): string {
    const d = (issueDescription || "").toLowerCase();

    const responsibility =
      /\bresponsibilit|vague\s+bullet|placeholder|duty|duties|day[- ]to[- ]day|what\s+you(?:'ll|\s+will)\s+do|role\s+overview\b/.test(
        d
      ) ||
      (issueType === "ambiguity" && /\bvague|placeholder|responsibilit|bullet/.test(d));
    if (responsibility) {
      return `OUTPUT FORMAT — Responsibilities
Write 4–10 lines only. Each line MUST start with "• " and state a concrete outcome, scope, or duty (candidate-facing). No section title unless one short line like "Key responsibilities" immediately followed by bullets. No preamble.`;
    }

    if (/\bskill|technolog|tech\s*stack|stack|framework|language|tool|platform\b/.test(d)) {
      return `OUTPUT FORMAT — Skills / requirements
Write JD-ready lines only: use "Required:" and optional "Preferred:" labels with comma or bullet lists, OR only "• " lines listing skills. No advice about how to organize — just the final text.`;
    }

    if (
      /\blocation|remote|hybrid|on[- ]?site|in[- ]?office|work\s+environment|culture|timezone|distributed\b/.test(
        d
      )
    ) {
      return `OUTPUT FORMAT — Work arrangement / environment
Write one short paragraph (2–5 sentences): location, remote/hybrid/on-site, and optional core hours or travel. Reads as part of a job posting — not instructions to the employer.`;
    }

    if (/\bsalary|compensation|pay\s*range|benefit|equity|rsu|401\b/.test(d)) {
      return `OUTPUT FORMAT — Compensation / benefits
Write paste-ready lines: realistic range or wording for this title when possible, plus brief benefits if appropriate. No "add a section" commentary.`;
    }

    if (/\bexperience\b/.test(d) && /\b(year|yr|years?|senior|junior|mid|lead)\b/.test(d)) {
      return `OUTPUT FORMAT — Experience
Write 1–3 sentences as under Qualifications / Requirements (years, level, domain). No coaching.`;
    }

    if (issueType === "missing") {
      return `OUTPUT FORMAT — Missing content
Write only the JD fragment (paragraph and/or bullets) that fills the gap.`;
    }
    if (issueType === "unrealistic") {
      return `OUTPUT FORMAT — Realistic wording
Write only replacement requirement text — balanced and market-appropriate. No explanation of why the old text was wrong.`;
    }

    return `OUTPUT FORMAT — General
Write only the revised or added passage for the job description (paragraph and/or bullets).`;
  }

  private buildTargetedImprovementPrompt(input: {
    jobTitle: string;
    rawJD: string;
    issueType: string;
    issueDescription: string;
    improvementPrompt?: string;
  }): string {
    const maxChars = 4000;
    const raw = input.rawJD || "";
    const jdBody =
      raw.length <= maxChars ? raw : `${raw.slice(0, maxChars)}\n\n[… JD truncated …]`;

    const contract = this.inferTargetedImprovementOutputContract(
      input.issueType,
      input.issueDescription || ""
    );

    const note = (input.improvementPrompt || "").trim();
    const noteBlock = note
      ? `\nGap to cover with JD copy only (do not repeat as instructions to the reader):\n${note}\n`
      : "";

    return `You write hiring content for public job postings.

Respond with exactly one JSON object and no other text:
{"suggestion":"<string>"}

The "suggestion" value must be FINAL job-description copy only — the exact wording candidates see after the fix. Third-person or neutral JD voice.

STRICTLY FORBIDDEN inside "suggestion" (including as a prefix or label line):
• Imperatives to the employer: "Replace…", "Instead of…", "Consider…", "You should…", "We recommend…", "Try to…", "Make sure…", "Add a section…"
• Meta labels: "Generated Suggestion", "Suggested wording:", "Draft:", "For example:", "Here is", "Below is", "The following"
• Explanations, rationale, tips, or numbered advice about what to do
• Markdown code fences or nested JSON

${contract}

Issue type: ${input.issueType}
Issue label: ${input.issueDescription}
Role title: ${input.jobTitle}${noteBlock}
--- Job description (context) ---
${jdBody}
---

"suggestion" = paste-ready body only. Single JSON object; "suggestion" is the only key.`;
  }

  private parseTargetedImprovementResponse(response: any): any {
    try {
      let content = '';
      if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || response.choices[0].text || '';
      } else if (response.content) {
        content = response.content;
      } else {
        content = String(response);
      }

      // Try to parse JSON response
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        suggestion: parsed.suggestion || 'Unable to generate improvement suggestion.'
      };
    } catch (error: any) {
      throw createAIError(
        AIErrorCode.SCHEMA_VALIDATION_FAILED,
        `Failed to parse targeted improvement response: ${error?.message || 'Unknown error'}`,
        { provider: this.name, details: { response, error } }
      );
    }
  }
}
