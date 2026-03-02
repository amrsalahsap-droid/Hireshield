import { z } from 'zod';
import { CONSTRAINTS, SignalSchema_v1, MetadataSchema_v1 } from './base';

/**
 * Job Analysis AI Contract Schema
 * Defines the structure for AI-generated job description analysis results
 */

// Requirement analysis from job description
export const RequirementAnalysisSchema_v1 = z.object({
  requirement: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  type: z.enum(['skill', 'experience', 'education', 'certification', 'tool', 'soft_skill']),
  importance: z.enum(['nice_to_have', 'preferred', 'required', 'critical']),
  level: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
}).strict();

// Responsibility analysis
export const ResponsibilityAnalysisSchema_v1 = z.object({
  responsibility: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
  category: z.enum(['technical', 'management', 'communication', 'strategy', 'operations']),
  complexity: z.enum(['simple', 'moderate', 'complex', 'very_complex']),
  impact: z.enum(['individual', 'team', 'department', 'organization']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'as_needed']),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(2),
}).strict();

// Company culture indicators
export const CultureIndicatorSchema_v1 = z.object({
  aspect: z.enum(['work_life_balance', 'innovation', 'collaboration', 'autonomy', 'growth', 'diversity']),
  level: z.enum(['low', 'medium', 'high']),
  description: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(2),
}).strict();

// Compensation and benefits analysis
export const CompensationAnalysisSchema_v1 = z.object({
  salaryRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    currency: z.string().length(3),
    confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  }).optional(),
  benefits: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  perks: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  remoteWork: z.enum(['on_site', 'hybrid', 'remote', 'flexible']),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
}).strict();

// Complete job analysis contract
export const JobAnalysisContract_v1 = z.object({
  // Metadata
  metadata: MetadataSchema_v1,
  
  // Core job data
  jobId: z.string().uuid(),
  
  // Analysis results
  overallScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  clarityScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  
  // Detailed analyses
  requirements: z.array(RequirementAnalysisSchema_v1).max(20),
  responsibilities: z.array(ResponsibilityAnalysisSchema_v1).max(15),
  culture: z.array(CultureIndicatorSchema_v1).max(10),
  compensation: CompensationAnalysisSchema_v1,
  
  // Role classification
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive']),
  department: z.enum(['engineering', 'product', 'design', 'sales', 'marketing', 'hr', 'finance', 'operations', 'other']),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship']),
  
  // Difficulty and market analysis
  difficulty: z.enum(['easy', 'moderate', 'hard', 'very_hard']),
  marketDemand: z.enum(['low', 'medium', 'high', 'very_high']),
  competitionLevel: z.enum(['low', 'medium', 'high', 'very_high']),
  
  // Key insights
  uniqueSellingPoints: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  potentialConcerns: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  missingInformation: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  
  // Candidate profile suggestions
  idealCandidate: z.object({
    experience: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
    skills: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
    education: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
    personality: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  }),
  
  // Signals for evaluation
  signals: z.array(SignalSchema_v1).max(CONSTRAINTS.MAX_SIGNALS_COUNT),
}).strict();

// Export the versioned schema
export const JobAnalysisSchema = JobAnalysisContract_v1;

// Type exports
export type JobAnalysisContract = z.infer<typeof JobAnalysisContract_v1>;
export type RequirementAnalysis = z.infer<typeof RequirementAnalysisSchema_v1>;
export type ResponsibilityAnalysis = z.infer<typeof ResponsibilityAnalysisSchema_v1>;
export type CultureIndicator = z.infer<typeof CultureIndicatorSchema_v1>;
export type CompensationAnalysis = z.infer<typeof CompensationAnalysisSchema_v1>;
