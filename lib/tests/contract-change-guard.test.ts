import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { JDExtraction_v1 } from '../schemas/jd-extraction';
import { InterviewKit_v1 } from '../schemas/interview-kit';
import { CandidateSignals_v1 } from '../schemas/candidate-signals';
import { FinalScore_v1 } from '../schemas/final-score';

// Expected v1 schema keys - acts as a snapshot
const EXPECTED_V1_KEYS = {
  jdExtraction: [
    'roleTitle',
    'seniorityLevel', 
    'requiredSkills',
    'preferredSkills',
    'keyResponsibilities',
    'ambiguities',
    'unrealisticExpectations',
    'missingCriteria'
  ],
  interviewKit: [
    'roleTitle',
    'competencies'
  ],
  candidateSignals: [
    'candidateSummary',
    'categoryRatings',
    'strengths',
    'gaps',
    'riskFlags',
    'inconsistencies',
    'verificationQuestions',
    'ignoredAttributesNotice'
  ],
  finalScore: [
    'finalScore',
    'riskLevel',
    'breakdown',
    'topReasons',
    'computedAt'
  ]
};

// Helper to extract top-level keys from Zod schema
function getSchemaKeys(schema: z.ZodObject<any>): string[] {
  return Object.keys(schema.shape);
}

describe('Contract Change Guard - Schema Stability', () => {
  describe('JDExtraction_v1', () => {
    it('should maintain expected v1 keys', () => {
      const actualKeys = getSchemaKeys(JDExtraction_v1);
      expect(actualKeys).toEqual(EXPECTED_V1_KEYS.jdExtraction);
    });

    it('should not have removed any required fields', () => {
      const actualKeys = getSchemaKeys(JDExtraction_v1);
      const missingKeys = EXPECTED_V1_KEYS.jdExtraction.filter(key => !actualKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });

    it('should not have added new fields without version bump', () => {
      const actualKeys = getSchemaKeys(JDExtraction_v1);
      const extraKeys = actualKeys.filter(key => !EXPECTED_V1_KEYS.jdExtraction.includes(key));
      expect(extraKeys).toEqual([]);
    });
  });

  describe('InterviewKit_v1', () => {
    it('should maintain expected v1 keys', () => {
      const actualKeys = getSchemaKeys(InterviewKit_v1);
      expect(actualKeys).toEqual(EXPECTED_V1_KEYS.interviewKit);
    });

    it('should not have removed any required fields', () => {
      const actualKeys = getSchemaKeys(InterviewKit_v1);
      const missingKeys = EXPECTED_V1_KEYS.interviewKit.filter(key => !actualKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });

    it('should not have added new fields without version bump', () => {
      const actualKeys = getSchemaKeys(InterviewKit_v1);
      const extraKeys = actualKeys.filter(key => !EXPECTED_V1_KEYS.interviewKit.includes(key));
      expect(extraKeys).toEqual([]);
    });
  });

  describe('CandidateSignals_v1', () => {
    it('should maintain expected v1 keys', () => {
      const actualKeys = getSchemaKeys(CandidateSignals_v1);
      expect(actualKeys).toEqual(EXPECTED_V1_KEYS.candidateSignals);
    });

    it('should not have removed any required fields', () => {
      const actualKeys = getSchemaKeys(CandidateSignals_v1);
      const missingKeys = EXPECTED_V1_KEYS.candidateSignals.filter(key => !actualKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });

    it('should not have added new fields without version bump', () => {
      const actualKeys = getSchemaKeys(CandidateSignals_v1);
      const extraKeys = actualKeys.filter(key => !EXPECTED_V1_KEYS.candidateSignals.includes(key));
      expect(extraKeys).toEqual([]);
    });
  });

  describe('FinalScore_v1', () => {
    it('should maintain expected v1 keys', () => {
      const actualKeys = getSchemaKeys(FinalScore_v1);
      expect(actualKeys).toEqual(EXPECTED_V1_KEYS.finalScore);
    });

    it('should not have removed any required fields', () => {
      const actualKeys = getSchemaKeys(FinalScore_v1);
      const missingKeys = EXPECTED_V1_KEYS.finalScore.filter(key => !actualKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });

    it('should not have added new fields without version bump', () => {
      const actualKeys = getSchemaKeys(FinalScore_v1);
      const extraKeys = actualKeys.filter(key => !EXPECTED_V1_KEYS.finalScore.includes(key));
      expect(extraKeys).toEqual([]);
    });
  });
});
