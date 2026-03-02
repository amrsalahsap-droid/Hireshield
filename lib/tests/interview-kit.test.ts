import { describe, it, expect } from 'vitest';
import { InterviewKit_v1 } from '../schemas/interview-kit';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('InterviewKit_v1 Schema', () => {
  const validSample = JSON.parse(
    readFileSync(join(__dirname, '../../testdata/ai/interview_kit_v1.valid.json'), 'utf8')
  );

  it('should accept valid sample data', () => {
    const result = InterviewKit_v1.parse(validSample);
    expect(result.roleTitle).toBe('Senior Software Engineer');
    expect(result.competencies).toHaveLength(1);
    expect(result.competencies[0].name).toBe('Technical Problem Solving');
    expect(result.competencies[0].questions.behavioral).toHaveLength(2);
    expect(result.competencies[0].questions.technical).toHaveLength(2);
    expect(result.competencies[0].questions.scenario).toHaveLength(1);
    expect(result.competencies[0].questions.cultureFit).toHaveLength(1);
    expect(result.competencies[0].questions.redFlagProbes).toHaveLength(1);
  });

  it('should reject data with unknown keys', () => {
    const invalidData = {
      ...validSample,
      unknownField: 'this should cause rejection'
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many competencies', () => {
    const invalidData = {
      ...validSample,
      competencies: Array(15).fill(validSample.competencies[0]) // 15 > 10
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with role title too long', () => {
    const invalidData = {
      ...validSample,
      roleTitle: 'a'.repeat(150) // 150 > 120
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with too many behavioral questions', () => {
    const invalidData = {
      ...validSample,
      competencies: [
        {
          ...validSample.competencies[0],
          questions: {
            ...validSample.competencies[0].questions,
            behavioral: Array(15).fill(validSample.competencies[0].questions.behavioral[0]) // 15 > 12
          }
        }
      ]
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with missing scoring guide', () => {
    const invalidData = {
      ...validSample,
      competencies: [
        {
          ...validSample.competencies[0],
          questions: {
            ...validSample.competencies[0].questions,
            behavioral: [
              {
                question: 'Test question',
                whatGoodLooksLike: 'Test description',
                // Missing scoringGuide
              }
            ]
          }
        }
      ]
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with scoring guide strings too long', () => {
    const invalidData = {
      ...validSample,
      competencies: [
        {
          ...validSample.competencies[0],
          questions: {
            ...validSample.competencies[0].questions,
            behavioral: [
              {
                ...validSample.competencies[0].questions.behavioral[0],
                scoringGuide: {
                  '1': 'a'.repeat(180), // 180 > 160
                  '3': 'Average response',
                  '5': 'Excellent response'
                }
              }
            ]
          }
        }
      ]
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });

  it('should reject data with question string too long', () => {
    const invalidData = {
      ...validSample,
      competencies: [
        {
          ...validSample.competencies[0],
          questions: {
            ...validSample.competencies[0].questions,
            behavioral: [
              {
                ...validSample.competencies[0].questions.behavioral[0],
                question: 'a'.repeat(250) // 250 > 220
              }
            ]
          }
        }
      ]
    };
    expect(() => InterviewKit_v1.parse(invalidData)).toThrow();
  });
});
