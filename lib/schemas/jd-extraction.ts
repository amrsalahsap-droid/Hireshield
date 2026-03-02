import { z } from 'zod';
import { EvidenceSchema_v1, CONSTRAINTS } from './base';

/**
 * JD Extraction AI Contract Schema
 * Defines the structure for AI-generated job description analysis and extraction
 */

// Ambiguity analysis from job description
export const JDAmbiguitySchema_v1 = z.object({
  issue: z.string().max(160),
  suggestedClarification: z.string().max(200),
  evidence: EvidenceSchema_v1.extend({
    source: z.literal('job_description'),
  }),
}).strict();

// Unrealistic expectation analysis
export const JDUnrealisticExpectationSchema_v1 = z.object({
  issue: z.string().max(160),
  whyUnrealistic: z.string().max(200),
  evidence: EvidenceSchema_v1.extend({
    source: z.literal('job_description'),
  }),
}).strict();

// Missing criteria analysis
export const JDMissingCriteriaSchema_v1 = z.object({
  missing: z.string().max(160),
  suggestedCriteria: z.string().max(200),
}).strict();

// Complete JD extraction contract
export const JDExtraction_v1 = z.object({
  // Core role information
  roleTitle: z.string().max(120),
  seniorityLevel: z.enum([
    'INTERN',
    'JUNIOR', 
    'MID',
    'SENIOR',
    'LEAD',
    'MANAGER',
    'DIRECTOR',
    'UNKNOWN'
  ]),
  
  // Skills analysis
  requiredSkills: z.array(z.string().max(60)).max(20),
  preferredSkills: z.array(z.string().max(60)).max(20),
  
  // Responsibilities
  keyResponsibilities: z.array(z.string().max(160)).max(15),
  
  // Quality analysis
  ambiguities: z.array(JDAmbiguitySchema_v1).max(10),
  unrealisticExpectations: z.array(JDUnrealisticExpectationSchema_v1).max(10),
  missingCriteria: z.array(JDMissingCriteriaSchema_v1).max(10),
}).strict();

// Type exports
export type JDExtraction = z.infer<typeof JDExtraction_v1>;
export type JDAmbiguity = z.infer<typeof JDAmbiguitySchema_v1>;
export type JDUnrealisticExpectation = z.infer<typeof JDUnrealisticExpectationSchema_v1>;
export type JDMissingCriteria = z.infer<typeof JDMissingCriteriaSchema_v1>;
