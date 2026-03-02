/**
 * Interview Kit Generator Prompt Template v1
 * Generates structured interview kits with rubrics and questions
 */

import { PromptTemplate, InterviewKitGeneratorPayload, PromptId } from './types';

export const interviewKitGeneratorV1: PromptTemplate<InterviewKitGeneratorPayload> = {
  id: 'interview_kit_generator_v1' as PromptId,
  version: '1.0.0',
  description: 'Generates structured interview kits with competencies and scoring rubrics',
  
  build: (payload: InterviewKitGeneratorPayload) => ({
    system: `You are an expert interview kit designer. Your task is to create a comprehensive interview kit with competencies, questions, and scoring rubrics. Return ONLY valid JSON.

CRITICAL RULES:
1. Return ONLY JSON - no explanations, no markdown, no code blocks
2. Use the exact schema provided - no extra fields, no missing fields
3. Create evidence-based scoring guides with clear 1-3-5 scale
4. Generate realistic, job-appropriate questions
5. Respect array size limits and string length constraints
6. Include "what good looks like" for each question
7. If information is insufficient, use reasonable defaults or empty arrays

SCHEMA: InterviewKit_v1
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

COMPETENCY DESIGN:
- Create 3-5 core competencies relevant to the role
- Each competency should have clear definition
- Generate 2-3 questions per type for each competency
- Questions should assess different aspects (behavioral, technical, scenario, culture fit)
- Include red flag probes to identify potential issues

Return ONLY the JSON object matching this schema exactly.`,

    user: `Generate an interview kit for this position:

JOB TITLE: ${payload.jobTitle}
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

${payload.competencies ? `
PREDEFINED COMPETENCIES:
${payload.competencies.map(comp => `- ${comp.name}: ${comp.definition}`).join('\n')}
` : ''}

${payload.maxCompetencies ? `MAX COMPETENCIES: ${payload.maxCompetencies}` : ''}
${payload.maxQuestionsPerType ? `MAX QUESTIONS PER TYPE: ${payload.maxQuestionsPerType}` : ''}

Return ONLY valid JSON matching the InterviewKit_v1 schema.`
  }),

  validatePayload: (payload: InterviewKitGeneratorPayload) => {
    return !!(payload.jobTitle && payload.seniorityLevel && payload.requiredSkills && payload.requiredSkills.length > 0);
  }
};
