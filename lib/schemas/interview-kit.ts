import { z } from 'zod';

/**
 * Interview Kit AI Contract Schema
 * Defines the structure for AI-generated interview kits with rubrics
 */

// Scoring guide for questions (1-3-5 scale)
export const ScoringGuideSchema_v1 = z.object({
  '1': z.string().max(160), // Poor response
  '3': z.string().max(160), // Average response  
  '5': z.string().max(160), // Excellent response
}).strict();

// Individual question with scoring rubric
export const QuestionSchema_v1 = z.object({
  question: z.string().max(220),
  whatGoodLooksLike: z.string().max(220),
  scoringGuide: ScoringGuideSchema_v1,
}).strict();

// Questions organized by type
export const QuestionsByTypeSchema_v1 = z.object({
  behavioral: z.array(QuestionSchema_v1).max(12),
  technical: z.array(QuestionSchema_v1).max(12),
  scenario: z.array(QuestionSchema_v1).max(12),
  cultureFit: z.array(QuestionSchema_v1).max(8),
  redFlagProbes: z.array(QuestionSchema_v1).max(8),
}).strict();

// Individual competency with questions
export const CompetencySchema_v1 = z.object({
  name: z.string().max(60),
  definition: z.string().max(200),
  questions: QuestionsByTypeSchema_v1,
}).strict();

// Complete interview kit contract
export const InterviewKit_v1 = z.object({
  roleTitle: z.string().max(120),
  competencies: z.array(CompetencySchema_v1).max(10),
}).strict();

// Type exports
export type InterviewKit = z.infer<typeof InterviewKit_v1>;
export type Competency = z.infer<typeof CompetencySchema_v1>;
export type QuestionsByType = z.infer<typeof QuestionsByTypeSchema_v1>;
export type Question = z.infer<typeof QuestionSchema_v1>;
export type ScoringGuide = z.infer<typeof ScoringGuideSchema_v1>;
