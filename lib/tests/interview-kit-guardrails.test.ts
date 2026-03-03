import { describe, it, expect } from 'vitest';
import { JDExtraction_v1 } from '@/lib/schemas/jd-extraction';

describe('Interview Kit Generation Guardrails', () => {
  describe('JD Extraction Validation', () => {
    it('should validate correct JD extraction data', () => {
      const validData = {
        roleTitle: "Senior Software Engineer",
        seniorityLevel: "SENIOR" as const,
        requiredSkills: ["JavaScript", "React", "Node.js"],
        preferredSkills: ["TypeScript", "AWS"],
        keyResponsibilities: ["Develop web applications", "Code review"],
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requiredSkills).toHaveLength(3);
        expect(result.data.keyResponsibilities).toHaveLength(2);
      }
    });

    it('should reject JD extraction with too many required skills', () => {
      const invalidData = {
        roleTitle: "Senior Software Engineer",
        seniorityLevel: "SENIOR" as const,
        requiredSkills: Array(21).fill("skill"), // 21 skills > limit of 20
        preferredSkills: [],
        keyResponsibilities: ["Develop web applications"],
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject JD extraction with too many key responsibilities', () => {
      const invalidData = {
        roleTitle: "Senior Software Engineer",
        seniorityLevel: "SENIOR" as const,
        requiredSkills: ["JavaScript"],
        preferredSkills: [],
        keyResponsibilities: Array(16).fill("responsibility"), // 16 responsibilities > limit of 15
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject JD extraction with invalid seniority level', () => {
      const invalidData = {
        roleTitle: "Senior Software Engineer",
        seniorityLevel: "INVALID_LEVEL" as any,
        requiredSkills: ["JavaScript"],
        preferredSkills: [],
        keyResponsibilities: ["Develop web applications"],
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject JD extraction with missing required fields', () => {
      const invalidData = {
        requiredSkills: ["JavaScript"],
        preferredSkills: [],
        keyResponsibilities: ["Develop web applications"],
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject JD extraction with malformed data', () => {
      const invalidData = {
        roleTitle: 123, // Should be string
        seniorityLevel: "SENIOR" as const,
        requiredSkills: "not an array", // Should be array
        preferredSkills: [],
        keyResponsibilities: ["Develop web applications"],
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept JD extraction at the limits', () => {
      const validData = {
        roleTitle: "Senior Software Engineer",
        seniorityLevel: "SENIOR" as const,
        requiredSkills: Array(20).fill("skill"), // Exactly 20 skills
        preferredSkills: Array(20).fill("preferred"), // Exactly 20 preferred skills
        keyResponsibilities: Array(15).fill("responsibility"), // Exactly 15 responsibilities
        ambiguities: [],
        unrealisticExpectations: [],
        missingCriteria: [],
      };

      const result = JDExtraction_v1.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requiredSkills).toHaveLength(20);
        expect(result.data.keyResponsibilities).toHaveLength(15);
      }
    });
  });
});
