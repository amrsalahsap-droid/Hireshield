/**
 * JD quality improvement scoring: dimension weights, severity multipliers,
 * and normalized UI points (1–10 scale) for issues and minor improvements.
 */

export const DIMENSION_WEIGHTS = {
  clarity: 25,
  completeness: 35,
  skills: 20,
  responsibilities: 20,
} as const;

export type JdScoreDimension = keyof typeof DIMENSION_WEIGHTS;

export const JD_SCORE_DIMENSION_MAX: Record<JdScoreDimension, number> = {
  clarity: DIMENSION_WEIGHTS.clarity,
  completeness: DIMENSION_WEIGHTS.completeness,
  skills: DIMENSION_WEIGHTS.skills,
  responsibilities: DIMENSION_WEIGHTS.responsibilities,
};

export const SEVERITY_MULTIPLIERS = {
  critical: 0.6,
  major: 0.4,
  minor: 0.25,
} as const;

export type JdIssueSeverity = keyof typeof SEVERITY_MULTIPLIERS;

export type JdUnifiedIssueType = 'ambiguity' | 'unrealistic' | 'missing';

export interface JdUnifiedIssueForScoring {
  type: JdUnifiedIssueType;
  title: string;
}

export function computeRawImpact(dimension: JdScoreDimension, severity: JdIssueSeverity): number {
  return DIMENSION_WEIGHTS[dimension] * SEVERITY_MULTIPLIERS[severity];
}

/** Spec: Math.round((impact / 35) * 10); clamp 1–10 when raw > 0. */
export function normalizeImpactToUiPoints(rawImpact: number): number {
  if (rawImpact <= 0) return 0;
  let n = Math.round((rawImpact / 35) * 10);
  if (n < 1) n = 1;
  if (n > 10) n = 10;
  return n;
}

export function uiPointsForIssue(dimension: JdScoreDimension, severity: JdIssueSeverity): number {
  return normalizeImpactToUiPoints(computeRawImpact(dimension, severity));
}

const MISSING_TITLE_RULES: Array<{ test: (t: string) => boolean; dimension: JdScoreDimension }> = [
  {
    test: (t) =>
      t.includes('salary') ||
      t.includes('compensation') ||
      t.includes('pay') ||
      t.includes('location') ||
      t.includes('remote') ||
      t.includes('hybrid'),
    dimension: 'completeness',
  },
  {
    test: (t) =>
      t.includes('environment') || t.includes('culture') || t.includes('benefits'),
    dimension: 'completeness',
  },
  {
    test: (t) =>
      t.includes('technolog') ||
      t.includes('tech stack') ||
      t.includes('skills') ||
      t.includes('tools'),
    dimension: 'skills',
  },
  {
    test: (t) =>
      t.includes('responsibilit') || t.includes('duties') || t.includes('daily'),
    dimension: 'responsibilities',
  },
];

export function mapMissingIssueToDimension(title: string): JdScoreDimension {
  const t = title.toLowerCase();
  for (const rule of MISSING_TITLE_RULES) {
    if (rule.test(t)) return rule.dimension;
  }
  if (t.includes('requirement') || t.includes('qualification') || t.includes('criteria')) {
    return 'clarity';
  }
  return 'completeness';
}

export function severityForUnifiedIssue(issue: JdUnifiedIssueForScoring): JdIssueSeverity {
  switch (issue.type) {
    case 'unrealistic':
      return 'critical';
    case 'missing':
      return 'major';
    case 'ambiguity':
    default:
      return 'major';
  }
}

export function dimensionForUnifiedIssue(issue: JdUnifiedIssueForScoring): JdScoreDimension {
  switch (issue.type) {
    case 'ambiguity':
      return 'clarity';
    case 'unrealistic':
      return 'completeness';
    case 'missing':
      return mapMissingIssueToDimension(issue.title);
    default:
      return 'completeness';
  }
}

export function unifiedIssueUiPoints(issue: JdUnifiedIssueForScoring): number {
  return uiPointsForIssue(dimensionForUnifiedIssue(issue), severityForUnifiedIssue(issue));
}

export const JD_CATEGORY_LABELS: Record<JdScoreDimension, string> = {
  clarity: 'Clarity',
  completeness: 'Completeness',
  skills: 'Skills',
  responsibilities: 'Responsibilities',
};
