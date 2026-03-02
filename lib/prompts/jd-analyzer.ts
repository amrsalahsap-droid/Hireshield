/**
 * JD Analyzer Prompt Template v1
 * Extracts structured information from job descriptions
 */

import { PromptTemplate, JDAnalyzerPayload, PromptId } from './types';

export const jdAnalyzerV1: PromptTemplate<JDAnalyzerPayload> = {
  id: 'jd_analyzer_v1' as PromptId,
  version: '1.0.0',
  description: 'Extracts structured job information from job descriptions',
  
  build: (payload: JDAnalyzerPayload) => ({
    system: `You are an expert job description analyzer. Your task is to extract structured information from job descriptions and return ONLY valid JSON.

CRITICAL RULES:
1. Return ONLY JSON - no explanations, no markdown, no code blocks
2. Use the exact schema provided - no extra fields, no missing fields
3. Be evidence-based - include quotes and source references
4. Use "UNKNOWN" for missing information, never guess
5. Avoid protected attributes (age, gender, race, religion, etc.)
6. Respect array size limits and string length constraints
7. If information is not present, use empty arrays or UNKNOWN values

SCHEMA: JDExtraction_v1
{
  "roleTitle": "string (max 120 chars)",
  "seniorityLevel": "enum: INTERN, JUNIOR, MID, SENIOR, LEAD, MANAGER, DIRECTOR, UNKNOWN",
  "requiredSkills": "array (max 20) of strings (max 60 chars each)",
  "preferredSkills": "array (max 20) of strings (max 60 chars each)",
  "keyResponsibilities": "array (max 15) of strings (max 160 chars each)",
  "ambiguities": "array (max 10) of objects with: issue, suggestedClarification, evidence",
  "unrealisticExpectations": "array (max 10) of objects with: issue, whyUnrealistic, evidence",
  "missingCriteria": "array (max 10) of objects with: missing, suggestedCriteria"
}

EVIDENCE FORMAT:
{
  "id": "uuid-string",
  "type": "quote",
  "content": "exact text from source",
  "source": "job_description",
  "context": "section description",
  "relevanceScore": "number 0-100"
}

Return ONLY the JSON object matching this schema exactly.`,

    user: `Analyze this job description and extract structured information:

TITLE: ${payload.title || 'Not specified'}
JOB DESCRIPTION:
${payload.jobDescription}

${payload.industry ? `INDUSTRY: ${payload.industry}` : ''}

${payload.maxSkills ? `MAX SKILLS TO EXTRACT: ${payload.maxSkills}` : ''}
${payload.maxResponsibilities ? `MAX RESPONSIBILITIES TO EXTRACT: ${payload.maxResponsibilities}` : ''}

Return ONLY valid JSON matching the JDExtraction_v1 schema.`
  }),

  validatePayload: (payload: JDAnalyzerPayload) => {
    return !!(payload.jobDescription && payload.jobDescription.trim().length > 0);
  }
};
