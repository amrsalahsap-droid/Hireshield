import { describe, it, expect } from 'vitest';
import { JDExtraction_v1 } from '../schemas/jd-extraction';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('JDExtraction_v1 Schema', () => {
  const validSample = JSON.parse(
    readFileSync(join(__dirname, '../../testdata/ai/jd_extraction_v1.valid.json'), 'utf8')
  );

  it('should accept valid sample data', () => {
    const result = JDExtraction_v1.parse(validSample);
    expect(result.roleTitle).toBe('Senior Software Engineer');
    expect(result.seniorityLevel).toBe('SENIOR');
    expect(result.requiredSkills).toContain('React');
    expect(result.ambiguities).toHaveLength(1);
    expect(result.unrealisticExpectations).toHaveLength(1);
    expect(result.missingCriteria).toHaveLength(2);
  });

  it('should reject data with unknown keys', () => {
    const invalidData = {
      ...validSample,
      unknownField: 'this should cause rejection'
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many required skills', () => {
    const invalidData = {
      ...validSample,
      requiredSkills: Array(25).fill('skill') // 25 > 20
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with role title too long', () => {
    const invalidData = {
      ...validSample,
      roleTitle: 'a'.repeat(150) // 150 > 120
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with invalid seniority level', () => {
    const invalidData = {
      ...validSample,
      seniorityLevel: 'INVALID_LEVEL'
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many ambiguities', () => {
    const invalidData = {
      ...validSample,
      ambiguities: Array(15).fill(validSample.ambiguities[0]) // 15 > 10
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });

  it('should enforce string length limits', () => {
    const invalidData = {
      ...validSample,
      missingCriteria: [
        {
          missing: 'a'.repeat(200), // 200 > 160
          suggestedCriteria: 'test'
        }
      ]
    };
    expect(() => JDExtraction_v1.parse(invalidData)).toThrow();
  });
});
