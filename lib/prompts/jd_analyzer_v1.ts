/**
 * JD Analyzer v1 Prompt Template
 * Extracts structured information from job descriptions in JDExtraction_v1 format
 */

import { PromptTemplate, JDAnalyzerPayload, PromptId } from './types';
import { getDefenseBlock } from './defense';

export const jdAnalyzerV1: PromptTemplate<JDAnalyzerPayload> = {
  id: 'jd_analyzer_v1' as PromptId,
  version: '1.0.0',
  description: 'Analyzes job descriptions and extracts structured information in JDExtraction_v1 format',
  
  build: (payload: JDAnalyzerPayload) => ({
    system: `You are an expert hiring analyst. Your task is to analyze job descriptions and extract structured information that matches the JDExtraction_v1 schema exactly.

${getDefenseBlock({
  includeProtectedAttributes: false,
  includeEvidenceBased: true
})}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching JDExtraction_v1 schema
- No extra fields, no missing required fields
- Use exact field names: roleTitle, seniorityLevel, requiredSkills, preferredSkills, keyResponsibilities, ambiguities, unrealisticExpectations, missingCriteria
- Respect all array size limits and string length constraints
- Use "UNKNOWN" for uncertain fields, never guess or invent values
- Return empty arrays rather than inventing items
- All evidence items must quote from JD only with source "job_description"

JDExtraction_v1 SCHEMA:
{
  "roleTitle": "string (max 120 chars)",
  "seniorityLevel": "enum: INTERN, JUNIOR, MID, SENIOR, LEAD, MANAGER, DIRECTOR, UNKNOWN",
  "requiredSkills": "array (max 20) of strings (max 60 chars each)",
  "preferredSkills": "array (max 20) of strings (max 60 chars each)",
  "keyResponsibilities": "array (max 15) of strings (max 160 chars each)",
  "ambiguities": "array (max 10) of objects with: issue (max 160), suggestedClarification (max 200), evidence",
  "unrealisticExpectations": "array (max 10) of objects with: issue (max 160), whyUnrealistic (max 200), evidence",
  "missingCriteria": "array (max 10) of objects with: missing (max 160), suggestedCriteria (max 200)"
}

EVIDENCE FORMAT:
{
  "id": "uuid-string",
  "type": "quote",
  "content": "exact text from job description",
  "source": "job_description",
  "context": "section where quote was found",
  "relevanceScore": "number 0-100"
}

PROCESSING RULES:
- Deduplicate skills (case-insensitive) - keep unique skill names
- Keep skill names short (max 60 chars) - truncate if necessary
- Do not analyze protected attributes (age, gender, race, etc.)
- Extract actual requirements, not assumptions
- Use professional language in summaries
- Focus on skills, experience, and qualifications
- If information is missing, use "UNKNOWN" or empty arrays

Return ONLY JSON object matching JDExtraction_v1 schema exactly.`,

    user: `Analyze this job description and extract structured information:

${payload.jobTitle ? `JOB TITLE: ${payload.jobTitle}` : ''}

---BEGIN_JD---
${payload.rawJD}
---END_JD---

Return ONLY valid JSON matching the JDExtraction_v1 schema with exact field names and constraints.`
  }),

  validatePayload: (payload: JDAnalyzerPayload) => {
    return !!(payload.rawJD && payload.rawJD.trim().length > 0);
  }
};
