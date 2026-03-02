/**
 * AI Contracts and Schemas
 * 
 * This file exports all AI output contracts and validation schemas.
 * All schemas follow strict conventions:
 * - Versioned with suffix (*_v1)
 * - Strict object validation (no unknown keys)
 * - Bounded sizes and lengths
 * - JSON-only outputs
 */

export type SchemaVersion = "v1";

// Import all schemas
import * as Base from './base';
import * as Evaluation from './evaluation';
import * as Interview from './interview';
import * as Candidate from './candidate';
import * as Job from './job';
import * as JDExtraction from './jd-extraction';
import * as InterviewKit from './interview-kit';
import * as CandidateSignals from './candidate-signals';
import * as FinalScore from './final-score';

// Re-export all schemas from their respective modules
export * from './base';
export * from './evaluation';
export * from './interview';
export * from './candidate';
export * from './job';
export * from './jd-extraction';
export * from './interview-kit';
export * from './candidate-signals';
export * from './final-score';

// Schema registry for version management
export const SCHEMAS = {
  // Current version
  v1: {
    evaluation: Evaluation.EvaluationSchema,
    interview: Interview.InterviewAnalysisSchema,
    candidate: Candidate.CandidateAnalysisSchema,
    job: Job.JobAnalysisSchema,
    jdExtraction: JDExtraction.JDExtraction_v1,
    interviewKit: InterviewKit.InterviewKit_v1,
    candidateSignals: CandidateSignals.CandidateSignals_v1,
    finalScore: FinalScore.FinalScore_v1,
  }
} as const;

// Helper to get schema by name and version
export function getSchema<T>(name: keyof typeof SCHEMAS.v1, version: SchemaVersion = "v1") {
  return SCHEMAS[version][name] as T;
}
