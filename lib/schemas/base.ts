import { z } from 'zod';

/**
 * Base schema conventions and shared types for all AI contracts
 */

// Schema version type
export type SchemaVersion = "v1";

// Base constraints
export const CONSTRAINTS = {
  // Text field limits
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_SUMMARY_LENGTH: 500,
  MAX_REASONING_LENGTH: 2000,
  MAX_QUOTE_LENGTH: 500,
  
  // Array limits
  MAX_SIGNALS_COUNT: 20,
  MAX_EVIDENCE_COUNT: 10,
  MAX_SKILLS_COUNT: 50,
  MAX_EXPERIENCES_COUNT: 20,
  
  // Score ranges
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  SCORE_PRECISION: 1, // decimal places
} as const;

// Base evidence schema (quotes/snippets from source material)
export const EvidenceSchema_v1 = z.object({
  id: z.string().uuid(),
  type: z.enum(['quote', 'snippet', 'reference']),
  content: z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH),
  source: z.enum(['cv', 'job_description', 'transcript']),
  context: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH).optional(),
  relevanceScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE).optional(),
}).strict();

// Base signal schema (individual evaluation signals)
export const SignalSchema_v1 = z.object({
  id: z.string().uuid(),
  category: z.enum(['technical', 'experience', 'soft_skills', 'education', 'communication']),
  name: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  value: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  reasoning: z.string().max(CONSTRAINTS.MAX_REASONING_LENGTH),
  evidence: z.array(EvidenceSchema_v1).max(CONSTRAINTS.MAX_EVIDENCE_COUNT),
  weight: z.number().min(0).max(1).default(1),
}).strict();

// Base metadata schema
export const MetadataSchema_v1 = z.object({
  schemaVersion: z.literal('v1'),
  generatedAt: z.string().datetime(),
  model: z.string().max(100),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  processingTime: z.number().positive().optional(),
  warnings: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).optional(),
}).strict();

// Base error schema for validation failures
export const ValidationErrorSchema_v1 = z.object({
  code: z.enum(['INVALID_SCHEMA', 'SIZE_LIMIT_EXCEEDED', 'MISSING_REQUIRED', 'INVALID_FORMAT']),
  message: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
  field: z.string().max(100).optional(),
  details: z.record(z.string(), z.any()).optional(),
}).strict();

// Helper to validate schema size
export function validateSchemaSize(data: any, maxSizeKB: number = 100): boolean {
  const sizeBytes = JSON.stringify(data).length;
  const sizeKB = sizeBytes / 1024;
  return sizeKB <= maxSizeKB;
}
