import { z } from 'zod';
import { CONSTRAINTS, SignalSchema_v1, MetadataSchema_v1 } from './base';

/**
 * Candidate Profile Analysis AI Contract Schema
 * Defines the structure for AI-generated candidate profile analysis results
 */

// Skill analysis from CV
export const SkillAnalysisSchema_v1 = z.object({
  skill: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  level: z.enum(['none', 'basic', 'intermediate', 'advanced', 'expert']),
  experience: z.number().min(0).max(50), // years
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
  confidence: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  category: z.enum(['technical', 'soft', 'domain', 'tool', 'methodology']),
}).strict();

// Experience analysis
export const ExperienceAnalysisSchema_v1 = z.object({
  title: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  company: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  duration: z.string().max(50), // e.g., "2 years 3 months"
  level: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']),
  relevance: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  achievements: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(3),
  responsibilities: z.array(z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH)).max(5),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(3),
}).strict();

// Education analysis
export const EducationAnalysisSchema_v1 = z.object({
  institution: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  degree: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  field: z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH),
  level: z.enum(['certificate', 'diploma', 'bachelor', 'master', 'phd']),
  relevance: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  graduationYear: z.number().min(1950).max(new Date().getFullYear() + 10),
  evidence: z.array(z.string().max(CONSTRAINTS.MAX_QUOTE_LENGTH)).max(2),
}).strict();

// Career progression analysis
export const CareerProgressionSchema_v1 = z.object({
  trajectory: z.enum(['declining', 'stable', 'growing', 'accelerating']),
  consistency: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  growthRate: z.number().min(-1).max(2), // negative for declining
  gaps: z.array(z.object({
    duration: z.string().max(50),
    reason: z.enum(['career_change', 'education', 'family', 'unemployment', 'unknown']),
    impact: z.enum(['negative', 'neutral', 'positive']),
  })).max(5),
  promotions: z.number().min(0).max(20),
  jobHops: z.number().min(0).max(50),
}).strict();

// Complete candidate analysis contract
export const CandidateAnalysisContract_v1 = z.object({
  // Metadata
  metadata: MetadataSchema_v1,
  
  // Core candidate data
  candidateId: z.string().uuid(),
  
  // Analysis results
  overallScore: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']),
  careerStability: z.number().min(CONSTRAINTS.MIN_SCORE).max(CONSTRAINTS.MAX_SCORE),
  
  // Detailed analyses
  skills: z.array(SkillAnalysisSchema_v1).max(CONSTRAINTS.MAX_SKILLS_COUNT),
  experience: z.array(ExperienceAnalysisSchema_v1).max(CONSTRAINTS.MAX_EXPERIENCES_COUNT),
  education: z.array(EducationAnalysisSchema_v1).max(5),
  careerProgression: CareerProgressionSchema_v1,
  
  // Key insights
  strengths: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  concerns: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(10),
  redFlags: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  
  // Suitability analysis
  suitableRoles: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  industries: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  companyTypes: z.array(z.enum(['startup', 'mid_size', 'enterprise', 'nonprofit', 'government'])).max(3),
  
  // Signals for evaluation
  signals: z.array(SignalSchema_v1).max(CONSTRAINTS.MAX_SIGNALS_COUNT),
  
  // Recommendations
  developmentAreas: z.array(z.string().max(CONSTRAINTS.MAX_TITLE_LENGTH)).max(5),
  nextCareerStep: z.string().max(CONSTRAINTS.MAX_DESCRIPTION_LENGTH).optional(),
}).strict();

// Export the versioned schema
export const CandidateAnalysisSchema = CandidateAnalysisContract_v1;

// Type exports
export type CandidateAnalysisContract = z.infer<typeof CandidateAnalysisContract_v1>;
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema_v1>;
export type ExperienceAnalysis = z.infer<typeof ExperienceAnalysisSchema_v1>;
export type EducationAnalysis = z.infer<typeof EducationAnalysisSchema_v1>;
export type CareerProgression = z.infer<typeof CareerProgressionSchema_v1>;
