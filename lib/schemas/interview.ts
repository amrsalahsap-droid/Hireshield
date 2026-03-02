import { z } from 'zod';
import { CONSTRAINTS, SignalSchema_v1, MetadataSchema_v1 } from './base';

/**
 * Interview Analysis AI Contract Schema
 * Defines the structure for AI-generated interview analysis results
 */

// Interview question analysis
export const QuestionAnalysisSchema_v1 = z.object({
  id: z.string().uuid(),
  question: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
  type: z.enum(['technical', 'behavioral', 'situational', 'case_study', 'culture_fit']),
  answerQuality: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  completeness: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  relevance: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  keyPoints: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  concerns: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(3),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
}).strict();

// Communication assessment
export const CommunicationAssessmentSchema_v1 = z.object({
  clarity: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  articulation: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  listening: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  engagement: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  strengths: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  improvements: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  examples: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
}).strict();

// Technical assessment from interview
export const TechnicalAssessmentSchema_v1 = z.object({
  problemSolving: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  technicalDepth: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  methodology: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  knowledge: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  practicalSkills: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  concepts: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  gaps: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  examples: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
}).strict();

// Behavioral assessment
export const BehavioralAssessmentSchema_v1 = z.object({
  problemSolving: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  teamwork: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  leadership: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  adaptability: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  conflictResolution: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  examples: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(5),
  redFlags: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(3),
}).strict();

// Complete interview analysis contract
export const InterviewAnalysisContract_v1 = z.object({
  // Metadata
  metadata: MetadataSchema_v1,
  
  // Core interview data
  interviewId: z.string().uuid(),
  jobId: z.string().uuid(),
  candidateId: z.string().uuid(),
  
  // Analysis results
  overallScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  recommendation: z.enum(['strong_no', 'no', 'maybe', 'yes', 'strong_yes']),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  
  // Detailed assessments
  questions: z.array(QuestionAnalysisSchema_v1).max(20),
  communication: CommunicationAssessmentSchema_v1,
  technical: TechnicalAssessmentSchema_v1,
  behavioral: BehavioralAssessmentSchema_v1,
  
  // Key insights
  strengths: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  concerns: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  redFlags: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  
  // Recommendations
  nextSteps: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(5),
  followUpQuestions: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(3),
  
  // Signals for evaluation
  signals: z.array(SignalSchema_v1).max(CONSTRAINTS.MAX_SIGNALS_COUNT),
}).strict();

// Export the versioned schema
export const InterviewAnalysisSchema = InterviewAnalysisContract_v1;

// Type exports
export type InterviewAnalysisContract = z.infer<typeof InterviewAnalysisContract_v1>;
export type QuestionAnalysis = z.infer<typeof QuestionAnalysisSchema_v1>;
export type CommunicationAssessment = z.infer<typeof CommunicationAssessmentSchema_v1>;
export type TechnicalAssessment = z.infer<typeof TechnicalAssessmentSchema_v1>;
export type BehavioralAssessment = z.infer<typeof BehavioralAssessmentSchema_v1>;
