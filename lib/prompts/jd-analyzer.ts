/**
 * JD Analyzer Prompt Template v1
 * Extracts structured information from job descriptions
 */

import { PromptTemplate, JDAnalyzerPayload, PromptId } from './types';
import { getDefenseBlock } from './defense';

export const jdAnalyzerV1: PromptTemplate<JDAnalyzerPayload> = {
  id: 'jd_analyzer_v1' as PromptId,
  version: '1.0.0',
  description: 'Extracts structured job information from job descriptions',
  
  build: (payload: JDAnalyzerPayload) => ({
    system: `You are an expert job description analyzer. Your task is to extract structured information from job descriptions and return ONLY valid JSON.

${getDefenseBlock({
  includeProtectedAttributes: false, // Job descriptions don't contain protected attributes
  includeEvidenceBased: true
})}

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
