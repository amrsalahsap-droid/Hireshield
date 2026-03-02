import { z } from 'zod';
import { EvidenceSchema_v1 } from './base';

/**
 * Candidate Signals AI Contract Schema
 * Defines the structure for AI-generated candidate analysis with evidence
 */

// Rating scale (1-5)
export const Rating1to5Schema_v1 = z.number().int().min(1).max(5);

// Severity levels for risk flags
export const SeveritySchema_v1 = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Strength with evidence
export const StrengthSchema_v1 = z.object({
  point: z.string().max(160),
  evidence: EvidenceSchema_v1.refine(evidence => 
    evidence.source === 'cv' || evidence.source === 'transcript', 
    {
      message: "Evidence source must be 'cv' or 'transcript' for strengths"
    }
  ),
}).strict();

// Gap with evidence
export const GapSchema_v1 = z.object({
  point: z.string().max(160),
  evidence: EvidenceSchema_v1.refine(evidence => 
    evidence.source === 'cv' || evidence.source === 'transcript', 
    {
      message: "Evidence source must be 'cv' or 'transcript' for gaps"
    }
  ),
}).strict();

// Risk flag with evidence
export const RiskFlagSchema_v1 = z.object({
  flag: z.string().max(140),
  severity: SeveritySchema_v1,
  whyItMatters: z.string().max(200),
  evidence: EvidenceSchema_v1.refine(evidence => 
    evidence.source === 'cv' || evidence.source === 'transcript', 
    {
      message: "Evidence source must be 'cv' or 'transcript' for risk flags"
    }
  ),
}).strict();

// Inconsistency with evidence
export const InconsistencySchema_v1 = z.object({
  issue: z.string().max(160),
  evidence: EvidenceSchema_v1.refine(evidence => 
    evidence.source === 'cv' || evidence.source === 'transcript', 
    {
      message: "Evidence source must be 'cv' or 'transcript' for inconsistencies"
    }
  ),
}).strict();

// Category ratings object
export const CategoryRatingsSchema_v1 = z.object({
  skillMatch: Rating1to5Schema_v1,
  behavioral: Rating1to5Schema_v1,
  communication: Rating1to5Schema_v1,
  cultureFit: Rating1to5Schema_v1,
}).strict();

// Complete candidate signals contract
export const CandidateSignals_v1 = z.object({
  candidateSummary: z.string().max(280),
  categoryRatings: CategoryRatingsSchema_v1,
  strengths: z.array(StrengthSchema_v1).max(8),
  gaps: z.array(GapSchema_v1).max(8),
  riskFlags: z.array(RiskFlagSchema_v1).max(10),
  inconsistencies: z.array(InconsistencySchema_v1).max(10),
  verificationQuestions: z.array(z.string().max(200)).max(10),
  ignoredAttributesNotice: z.string().max(240).refine(notice => 
    notice.toLowerCase().includes('protected') || 
    notice.toLowerCase().includes('discrimination') ||
    notice.toLowerCase().includes('equal opportunity') ||
    notice.toLowerCase().includes('bias') ||
    notice.toLowerCase().includes('attributes ignored'),
    {
      message: "Notice must indicate that protected attributes are ignored"
    }
  ),
}).strict();

// Type exports
export type CandidateSignals = z.infer<typeof CandidateSignals_v1>;
export type CategoryRatings = z.infer<typeof CategoryRatingsSchema_v1>;
export type Strength = z.infer<typeof StrengthSchema_v1>;
export type Gap = z.infer<typeof GapSchema_v1>;
export type RiskFlag = z.infer<typeof RiskFlagSchema_v1>;
export type Inconsistency = z.infer<typeof InconsistencySchema_v1>;
export type Rating1to5 = z.infer<typeof Rating1to5Schema_v1>;
export type Severity = z.infer<typeof SeveritySchema_v1>;
