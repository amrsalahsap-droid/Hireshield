import { describe, it, expect } from 'vitest';
import { CandidateSignals_v1 } from '../schemas/candidate-signals';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('CandidateSignals_v1 Schema', () => {
  const validSample = JSON.parse(
    readFileSync(join(__dirname, '../../testdata/ai/candidate_signals_v1.valid.json'), 'utf8')
  );

  it('should accept valid sample data', () => {
    const result = CandidateSignals_v1.parse(validSample);
    expect(result.candidateSummary).toContain('Strong technical candidate');
    expect(result.categoryRatings.skillMatch).toBe(4);
    expect(result.categoryRatings.behavioral).toBe(3);
    expect(result.strengths).toHaveLength(2);
    expect(result.gaps).toHaveLength(2);
    expect(result.riskFlags).toHaveLength(1);
    expect(result.inconsistencies).toHaveLength(1);
    expect(result.verificationQuestions).toHaveLength(4);
    expect(result.ignoredAttributesNotice).toContain('protected attributes');
  });

  it('should reject data with unknown keys', () => {
    const invalidData = {
      ...validSample,
      unknownField: 'this should cause rejection'
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with candidate summary too long', () => {
    const invalidData = {
      ...validSample,
      candidateSummary: 'a'.repeat(300) // 300 > 280
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid rating values', () => {
    const invalidData = {
      ...validSample,
      categoryRatings: {
        ...validSample.categoryRatings,
        skillMatch: 6 // Invalid: should be 1-5
      }
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many strengths', () => {
    const invalidData = {
      ...validSample,
      strengths: Array(12).fill(validSample.strengths[0]) // 12 > 8
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid severity', () => {
    const invalidData = {
      ...validSample,
      riskFlags: [
        {
          ...validSample.riskFlags[0],
          severity: 'CRITICAL' // Invalid enum
        }
      ]
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with missing evidence for strength', () => {
    const invalidData = {
      ...validSample,
      strengths: [
        {
          point: 'Good technical skills',
          // Missing evidence field
        }
      ]
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid evidence source', () => {
    const invalidData = {
      ...validSample,
      strengths: [
        {
          point: 'Good skills',
          evidence: {
            ...validSample.strengths[0].evidence,
            source: 'job_description' // Invalid: should be cv or transcript
          }
        }
      ]
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with missing protected attributes notice', () => {
    const invalidData = {
      ...validSample,
      ignoredAttributesNotice: 'Regular notice without required content'
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many verification questions', () => {
    const invalidData = {
      ...validSample,
      verificationQuestions: Array(15).fill('test question') // 15 > 10
    };
    expect(() => CandidateSignals_v1.parse(invalidData)).toThrow();
  });
});
