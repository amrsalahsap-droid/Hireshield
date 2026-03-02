import { z } from 'zod';
import { CONSTRAINTS, SignalSchema_v1, MetadataSchema_v1, SchemaVersion } from './base';

/**
 * Evaluation AI Contract Schema
 * Defines the structure for AI-generated evaluation results
 */

// Individual evaluation signal with evidence
export const EvaluationSignalSchema_v1 = SignalSchema_v1.extend({
  // Evaluation-specific signal categories
  category: z.enum([
    'technical_skills',
    'experience_fit',
    'communication',
    'problem_solving',
    'cultural_fit',
    'leadership',
    'learning_ability'
  ]),
  // Job relevance score (how relevant this signal is to the specific job)
  jobRelevance: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  // Candidate strength level
  strength: z.enum(['weak', 'moderate', 'strong', 'exceptional']),
}).strict();

// Overall evaluation summary
export const EvaluationSummarySchema_v1 = z.object({
  overallScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  recommendation: z.enum(['strong_no', 'no', 'maybe', 'yes', 'strong_yes']),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  summary: z.string().max(CONSTRAINTS.MAX_SUMMARY_LENGTH),
  strengths: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  concerns: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  nextSteps: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(5),
}).strict();

// Skills assessment
export const SkillsAssessmentSchema_v1 = z.object({
  technical: z.array(z.object({
    skill: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
    level: z.enum(['none', 'basic', 'intermediate', 'advanced', 'expert']),
    evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
  })).max(CONSTRAINTS.MAX_SKILLS_COUNT),
  soft: z.array(z.object({
    skill: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
    level: z.enum(['none', 'basic', 'intermediate', 'advanced', 'expert']),
    evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
  })).max(CONSTRAINTS.MAX_SKILLS_COUNT),
}).strict();

// Experience assessment
export const ExperienceAssessmentSchema_v1 = z.object({
  relevantYears: z.number().min(0).max(50),
  industryFit: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  levelMatch: z.enum(['junior', 'mid', 'senior', 'lead', 'executive', 'mismatch']),
  keyAchievements: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(5),
  gaps: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(5),
}).strict();

// Complete evaluation contract
export const EvaluationContract_v1 = z.object({
  // Metadata
  metadata: MetadataSchema_v1,
  
  // Core evaluation data
  jobId: z.string().uuid(),
  candidateId: z.string().uuid(),
  interviewId: z.string().uuid().optional(),
  
  // Evaluation results
  summary: EvaluationSummarySchema_v1,
  signals: z.array(EvaluationSignalSchema_v1).max(CONSTRAINTS.MAX_SIGNALS_COUNT),
  skills: SkillsAssessmentSchema_v1,
  experience: ExperienceAssessmentSchema_v1,
  
  // Additional analysis
  riskFactors: z.array(z.object({
    factor: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
    mitigation: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH).optional(),
  })).max(10),
  
  // Recommendations
  recommendations: z.array(z.object({
    type: z.enum(['hire', 'interview_further', 'reject', 'skill_development']),
    priority: z.enum(['low', 'medium', 'high']),
    description: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
    rationale: z.string().max(CONSTRAINTS.MAX_REASONING_LENGTH),
  })).max(5),
}).strict();

// Export the versioned schema
export const EvaluationSchema = EvaluationContract_v1;

// Type exports
export type EvaluationContract = z.infer<typeof EvaluationContract_v1>;
export type EvaluationSignal = z.infer<typeof EvaluationSignalSchema_v1>;
export type EvaluationSummary = z.infer<typeof EvaluationSummarySchema_v1>;
export type SkillsAssessment = z.infer<typeof SkillsAssessmentSchema_v1>;
export type ExperienceAssessment = z.infer<typeof ExperienceAssessmentSchema_v1>;
