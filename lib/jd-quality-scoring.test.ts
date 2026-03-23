import { describe, expect, it } from 'vitest';
import {
  computeScoreBreakdown,
  computeQualityScore,
  jdHasSignal,
  type UnifiedIssue,
} from './jd-quality-scoring';

// Minimal extraction fixture: represents a typical mid-quality JD extraction.
function baseExtraction() {
  return {
    seniorityLevel: 'SENIOR',
    department: undefined,
    experienceLevel: '5-8 years',
      qualifications: ['BS in Computer Science', '5+ years experience'],
    estimatedSalary: undefined,
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['GraphQL'],
    keyResponsibilities: [
      'Own features end-to-end',
      'Mentor junior engineers',
      'Write design docs',
      'Code review',
    ],
    preferredQualifications: [],
    ambiguities: [],
    unrealisticExpectations: [],
    missingCriteria: [],
  };
}

const NO_ISSUES: UnifiedIssue[] = [];

describe('jdHasSignal', () => {
  it('detects salary text', () => {
    expect(jdHasSignal('Salary range: $120,000 - $160,000', 'salary')).toBe(true);
    expect(jdHasSignal('Compensation range available', 'salary')).toBe(true);
    expect(jdHasSignal('Great opportunity to grow', 'salary')).toBe(false);
    expect(jdHasSignal(undefined, 'salary')).toBe(false);
  });

  it('detects location/remote text', () => {
    expect(jdHasSignal('This is a fully remote position.', 'location')).toBe(true);
    expect(jdHasSignal('Hybrid work arrangement.', 'location')).toBe(true);
    expect(jdHasSignal('Great company culture.', 'location')).toBe(false);
  });

  it('detects benefits text', () => {
    expect(jdHasSignal('Benefits include medical, dental, vision', 'benefits')).toBe(true);
    expect(jdHasSignal('We offer 401(k) matching', 'benefits')).toBe(true);
    expect(jdHasSignal('Competitive package', 'benefits')).toBe(false);
  });

  it('detects department/team text', () => {
    expect(jdHasSignal('Join the Engineering team and report to the VP', 'department')).toBe(true);
    expect(jdHasSignal('Reporting to the CTO', 'department')).toBe(true);
    expect(jdHasSignal('Great opportunity', 'department')).toBe(false);
  });

  it('detects experience text', () => {
    expect(jdHasSignal('3+ years of experience required', 'experience')).toBe(true);
    expect(jdHasSignal('Must have 5 years experience in React', 'experience')).toBe(true);
    expect(jdHasSignal('Some experience is preferred', 'experience')).toBe(false);
  });
});

describe('computeScoreBreakdown', () => {
  it('returns baseline scores for extraction with no rawJD', () => {
    const ext = baseExtraction();
    const b = computeScoreBreakdown(ext, NO_ISSUES);
    expect(b.clarity).toBeGreaterThan(0);
    expect(b.completeness).toBeGreaterThan(0);
    expect(b.skills).toBeGreaterThan(0);
    expect(b.responsibilities).toBeGreaterThan(0);
  });

  it('adding salary text to rawJD increases completeness even when estimatedSalary is undefined', () => {
    const ext = baseExtraction();
    const withoutSalary = computeScoreBreakdown(ext, NO_ISSUES, 'We are hiring.');
    const withSalary = computeScoreBreakdown(ext, NO_ISSUES, 'Salary range: $120,000 - $160,000 per year.');
    expect(withSalary.completeness).toBeGreaterThan(withoutSalary.completeness);
  });

  it('estimatedSalary in extraction gives full bonus (more than rawJD fallback alone)', () => {
    const ext = baseExtraction();
    const fromRawJD = computeScoreBreakdown(ext, NO_ISSUES, 'Salary range: $120k');
    const fromExtraction = computeScoreBreakdown(
      { ...ext, estimatedSalary: { min: 120000, max: 160000, currency: 'USD' } },
      NO_ISSUES,
    );
    expect(fromExtraction.completeness).toBeGreaterThan(fromRawJD.completeness);
  });

  it('adding a 5th skill increases the skills score (no premature saturation)', () => {
    const ext4 = { ...baseExtraction(), requiredSkills: ['A', 'B', 'C', 'D'] };
    const ext5 = { ...baseExtraction(), requiredSkills: ['A', 'B', 'C', 'D', 'E'] };
    const b4 = computeScoreBreakdown(ext4, NO_ISSUES);
    const b5 = computeScoreBreakdown(ext5, NO_ISSUES);
    expect(b5.skills).toBeGreaterThan(b4.skills);
  });

  it('adding a 7th and 8th skill still increases skills score', () => {
    const ext7 = { ...baseExtraction(), requiredSkills: Array.from({ length: 7 }, (_, i) => `S${i}`) };
    const ext8 = { ...baseExtraction(), requiredSkills: Array.from({ length: 8 }, (_, i) => `S${i}`) };
    const b7 = computeScoreBreakdown(ext7, NO_ISSUES);
    const b8 = computeScoreBreakdown(ext8, NO_ISSUES);
    expect(b8.skills).toBeGreaterThan(b7.skills);
  });

  it('adding responsibilities past 3 still increases the score', () => {
    const ext3 = { ...baseExtraction(), keyResponsibilities: ['A', 'B', 'C'] };
    const ext5 = { ...baseExtraction(), keyResponsibilities: ['A', 'B', 'C', 'D', 'E'] };
    const b3 = computeScoreBreakdown(ext3, NO_ISSUES);
    const b5 = computeScoreBreakdown(ext5, NO_ISSUES);
    expect(b5.responsibilities).toBeGreaterThan(b3.responsibilities);
  });

  it('resolving a missing issue gives a visible score increase (~3 pts)', () => {
    const ext = baseExtraction();
    const issues: UnifiedIssue[] = [
      { type: 'missing', title: 'Salary range', priority: 2 },
      { type: 'missing', title: 'Work location / remote policy', priority: 2 },
    ];
    const withIssues = computeScoreBreakdown(ext, issues);
    const withOneResolved = computeScoreBreakdown(ext, [issues[1]]);
    const totalWith = withIssues.clarity + withIssues.completeness + withIssues.skills + withIssues.responsibilities;
    const totalWithout = withOneResolved.clarity + withOneResolved.completeness + withOneResolved.skills + withOneResolved.responsibilities;
    expect(totalWithout - totalWith).toBeGreaterThanOrEqual(3);
  });

  it('seniorityLevel UNKNOWN does not get seniority bonus', () => {
    const ext = { ...baseExtraction(), seniorityLevel: 'UNKNOWN' };
    const b = computeScoreBreakdown(ext, NO_ISSUES);
    const extReal = { ...baseExtraction(), seniorityLevel: 'SENIOR' };
    const bReal = computeScoreBreakdown(extReal, NO_ISSUES);
    expect(bReal.clarity).toBeGreaterThan(b.clarity);
  });

  it('rawJD location and benefits signals contribute to completeness', () => {
    const ext = baseExtraction();
    const bare = computeScoreBreakdown(ext, NO_ISSUES, 'We are hiring.');
    const rich = computeScoreBreakdown(
      ext,
      NO_ISSUES,
      'This is a remote role. Benefits include medical, dental, and 401(k).',
    );
    expect(rich.completeness).toBeGreaterThan(bare.completeness);
  });

  it('no dimension exceeds its max', () => {
    const ext = {
      ...baseExtraction(),
      department: 'Engineering',
      estimatedSalary: { min: 100000, max: 200000, currency: 'USD' },
      qualifications: Array.from({ length: 10 }, (_, i) => `Q${i}`),
      requiredSkills: Array.from({ length: 15 }, (_, i) => `Skill${i}`),
      preferredSkills: ['Bonus'],
      keyResponsibilities: Array.from({ length: 10 }, (_, i) => `R${i}`),
      preferredQualifications: ['Nice to have'],
    };
    const rawJD = 'Salary range: $100k. Remote. Benefits include medical, dental. Reporting to CTO. 5+ years of experience. Preferred qualifications.';
    const b = computeScoreBreakdown(ext, NO_ISSUES, rawJD);
    expect(b.clarity).toBeLessThanOrEqual(25);
    expect(b.completeness).toBeLessThanOrEqual(35);
    expect(b.skills).toBeLessThanOrEqual(20);
    expect(b.responsibilities).toBeLessThanOrEqual(20);
  });
});

describe('computeQualityScore', () => {
  it('returns 0 for null extraction', () => {
    expect(computeQualityScore(null, NO_ISSUES)).toBe(0);
  });

  it('produces a reasonable mid-range score for a decent extraction', () => {
    const ext = baseExtraction();
    const score = computeQualityScore(ext, NO_ISSUES);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('a rich JD with all fields populated and rawJD signals can reach high scores', () => {
    const ext = {
      ...baseExtraction(),
      department: 'Engineering',
      estimatedSalary: { min: 120000, max: 160000, currency: 'USD' },
      qualifications: ['BS in CS', '5+ years experience', 'Strong communication'],
      preferredQualifications: ['MS degree', 'Leadership experience'],
      preferredSkills: ['GraphQL', 'Rust'],
      keyResponsibilities: Array.from({ length: 6 }, (_, i) => `Responsibility ${i + 1}`),
    };
    const rawJD = 'Remote-friendly. Benefits include medical, dental, 401(k). Salary range: $120k-$160k.';
    const score = computeQualityScore(ext, NO_ISSUES, rawJD);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('score never exceeds 100', () => {
    const ext = {
      ...baseExtraction(),
      department: 'Eng',
      estimatedSalary: { min: 100000, max: 200000, currency: 'USD' },
      qualifications: Array.from({ length: 10 }, (_, i) => `Q${i}`),
      preferredSkills: ['X'],
      preferredQualifications: ['Y'],
      keyResponsibilities: Array.from({ length: 10 }, (_, i) => `R${i}`),
    };
    const rawJD = 'Remote. Benefits include medical, dental, 401k. Salary $150k. Reporting to VP. 10 years of experience. Preferred: nice-to-have.';
    const score = computeQualityScore(ext, NO_ISSUES, rawJD);
    expect(score).toBeLessThanOrEqual(100);
  });
});
