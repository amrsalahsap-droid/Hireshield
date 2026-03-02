import { z } from 'zod';
import { EvidenceSchema_v1 } from './base';

/**
 * Final Score AI Contract Schema
 * Defines the structure for computed final scoring representation
 */

// Risk level enumeration
export const RiskLevelSchema_v1 = z.enum(['GREEN', 'YELLOW', 'RED']);

// Score breakdown components
export const ScoreBreakdownSchema_v1 = z.object({
  skillMatch: z.number().int().min(0).max(100),
  behavioral: z.number().int().min(0).max(100),
  communication: z.number().int().min(0).max(100),
  cultureFit: z.number().int().min(0).max(100),
  riskComponent: z.number().int().min(0).max(100),
}).strict();

// Top reason with evidence
export const TopReasonSchema_v1 = z.object({
  reason: z.string().max(200),
  evidence: EvidenceSchema_v1,
}).strict();

// Complete final score contract
export const FinalScore_v1 = z.object({
  finalScore: z.number().int().min(0).max(100),
  riskLevel: RiskLevelSchema_v1,
  breakdown: ScoreBreakdownSchema_v1,
  topReasons: z.array(TopReasonSchema_v1).max(6),
  computedAt: z.string().datetime(),
}).strict();

// Type exports
export type FinalScore = z.infer<typeof FinalScore_v1>;
export type RiskLevel = z.infer<typeof RiskLevelSchema_v1>;
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema_v1>;
export type TopReason = z.infer<typeof TopReasonSchema_v1>;
