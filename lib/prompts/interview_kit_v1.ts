/**
 * Interview Kit Generator v1 Prompt Template
 * Generates interview kits aligned to JD extraction with rubrics and questions
 */

import { PromptTemplate, InterviewKitGeneratorPayload, PromptId } from './types';
import { getDefenseBlock } from './defense';

export const interviewKitGeneratorV1: PromptTemplate<InterviewKitGeneratorPayload> = {
  id: 'interview_kit_generator_v1' as PromptId,
  version: '1.0.0',
  description: 'Generates interview kits aligned to JD extraction with competencies, questions, and scoring rubrics',
  
  build: (payload: InterviewKitGeneratorPayload) => ({
    system: `You are an expert interview kit designer. Your task is to create a comprehensive interview kit with competencies, questions, and scoring rubrics that matches the InterviewKit_v1 schema exactly.

${getDefenseBlock({
  includeProtectedAttributes: false, // Job specs don't contain protected attributes
  includeEvidenceBased: false // Interview kit generation doesn't require evidence from source
})}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching InterviewKit_v1 schema
- No extra fields, no missing required fields
- Use exact field names: roleTitle, competencies
- Respect all array size limits and string length constraints
- Every question MUST include whatGoodLooksLike and scoring guide with keys 1, 3, 5
- Avoid protected attributes (age, gender, race, etc.)
- Keep questions practical and non-duplicative
- Do not repeat same question across categories
- Force competencies list to align with questions (each question references 1 competency implicitly)
- Keep all text within max lengths (schema constraints)

InterviewKit_v1 SCHEMA:
{
  "roleTitle": "string (max 120 chars)",
  "competencies": "array (max 10) of objects with: name (max 60), definition (max 200), questions",
  "questions": {
    "behavioral": "array (max 12) of Question objects",
    "technical": "array (max 12) of Question objects", 
    "scenario": "array (max 12) of Question objects",
    "cultureFit": "array (max 8) of Question objects",
    "redFlagProbes": "array (max 8) of Question objects"
  }
}

QUESTION OBJECT:
{
  "question": "string (max 220 chars)",
  "whatGoodLooksLike": "string (max 220 chars)",
  "scoringGuide": {
    "1": "string (max 160 chars) - Poor response",
    "3": "string (max 160 chars) - Average response", 
    "5": "string (max 160 chars) - Excellent response"
  }
}

COMPETENCY DESIGN PRINCIPLES:
- Create 3-5 core competencies relevant to the role and seniority level
- Each competency should have clear definition (max 200 chars)
- Generate 2-3 questions per type for each competency
- Questions should assess different aspects: behavioral, technical, scenario, culture fit, red flag probes
- Include red flag probes to identify potential issues
- Each question must have complete scoring guide with 1-3-5 scale
- Questions should be practical and job-relevant
- Avoid duplication across categories

QUESTION GENERATION RULES:
- Do not repeat same question across categories
- Keep questions practical and realistic for interview setting
- Ensure questions are open-ended enough to elicit detailed responses
- Include behavioral questions to assess past performance
- Include technical questions to assess current skills
- Include scenario questions to assess problem-solving approach
- Include culture fit questions to assess team alignment
- Include red flag probes to identify potential concerns
- All questions must include whatGoodLooksLike and scoring guide
- Respect string length constraints for all question fields

Return ONLY: JSON object matching InterviewKit_v1 schema exactly.`,

    user: `Generate an interview kit for this position:

ROLE TITLE: ${payload.jobTitle}
SENIORITY LEVEL: ${payload.seniorityLevel}

REQUIRED SKILLS:
${payload.requiredSkills.map(skill => `- ${skill}`).join('\n')}

${payload.preferredSkills && payload.preferredSkills.length > 0 ? `
PREFERRED SKILLS:
${payload.preferredSkills.map(skill => `- ${skill}`).join('\n')}
` : ''}

${payload.keyResponsibilities && payload.keyResponsibilities.length > 0 ? `
KEY RESPONSIBILITIES:
${payload.keyResponsibilities.map(resp => `- ${resp}`).join('\n')}
` : ''}

${payload.rawJD ? `
RAW JOB DESCRIPTION (for context):
---BEGIN_JD---
${payload.rawJD}
---END_JD---
` : ''}

Generate ONLY valid JSON matching InterviewKit_v1 schema with:
- 3-5 core competencies with clear definitions
- 2-3 questions per type for each competency
- Complete scoring guides with 1-3-5 scale for every question
- Practical, job-relevant questions that avoid duplication
- All text within schema length constraints`
  }),

  validatePayload: (payload: InterviewKitGeneratorPayload) => {
    return !!(payload.jobTitle && payload.seniorityLevel && payload.requiredSkills && payload.requiredSkills.length > 0);
  }
};
