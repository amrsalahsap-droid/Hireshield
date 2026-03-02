import { describe, it, expect } from 'vitest';
import { FinalScore_v1 } from '../schemas/final-score';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('FinalScore_v1 Schema', () => {
  const validSample = JSON.parse(
    readFileSync(join(__dirname, '../../testdata/ai/final_score_v1.valid.json'), 'utf8')
  );

  it('should accept valid sample data', () => {
    const result = FinalScore_v1.parse(validSample);
    expect(result.finalScore).toBe(78);
    expect(result.riskLevel).toBe('YELLOW');
    expect(result.breakdown.skillMatch).toBe(85);
    expect(result.breakdown.behavioral).toBe(72);
    expect(result.breakdown.communication).toBe(80);
    expect(result.breakdown.cultureFit).toBe(75);
    expect(result.breakdown.riskComponent).toBe(65);
    expect(result.topReasons).toHaveLength(3);
    expect(result.computedAt).toBe('2026-03-02T01:45:00.000Z');
  });

  it('should reject data with unknown keys', () => {
    const invalidData = {
      ...validSample,
      unknownField: 'this should cause rejection'
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with final score out of bounds', () => {
    const invalidData = {
      ...validSample,
      finalScore: 150 // > 100
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid risk level', () => {
    const invalidData = {
      ...validSample,
      riskLevel: 'ORANGE' // Invalid enum
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with breakdown value out of bounds', () => {
    const invalidData = {
      ...validSample,
      breakdown: {
        ...validSample.breakdown,
        skillMatch: 120 // > 100
      }
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with non-integer final score', () => {
    const invalidData = {
      ...validSample,
      finalScore: 78.5 // Should be integer
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many top reasons', () => {
    const invalidData = {
      ...validSample,
      topReasons: Array(10).fill(validSample.topReasons[0]) // 10 > 6
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with missing evidence for top reason', () => {
    const invalidData = {
      ...validSample,
      topReasons: [
        {
          reason: 'Good technical skills',
          // Missing evidence field
        }
      ]
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with reason too long', () => {
    const invalidData = {
      ...validSample,
      topReasons: [
        {
          ...validSample.topReasons[0],
          reason: 'a'.repeat(250) // 250 > 200
        }
      ]
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid datetime format', () => {
    const invalidData = {
      ...validSample,
      computedAt: '2026-03-02 01:45:00' // Invalid ISO format
    };
    expect(() => FinalScore_v1.parse(invalidData)).toThrow();
  });
});
