import { describe, expect, it } from 'vitest';
import {
  computeRawImpact,
  dimensionForUnifiedIssue,
  mapMissingIssueToDimension,
  normalizeImpactToUiPoints,
  severityForUnifiedIssue,
  uiPointsForIssue,
  SEVERITY_MULTIPLIERS,
} from './jd-improvement-scoring';

describe('jd-improvement-scoring', () => {
  it('completeness critical and minor produce expected raw impact and UI points', () => {
    const rawCritical = computeRawImpact('completeness', 'critical');
    expect(rawCritical).toBe(35 * SEVERITY_MULTIPLIERS.critical);
    expect(normalizeImpactToUiPoints(rawCritical)).toBe(6);

    const rawMinor = computeRawImpact('completeness', 'minor');
    expect(rawMinor).toBeCloseTo(35 * SEVERITY_MULTIPLIERS.minor, 5);
    expect(normalizeImpactToUiPoints(rawMinor)).toBe(3);
  });

  it('for each dimension, critical UI points > major > minor', () => {
    const dims = ['clarity', 'completeness', 'skills', 'responsibilities'] as const;
    for (const d of dims) {
      const c = uiPointsForIssue(d, 'critical');
      const m = uiPointsForIssue(d, 'major');
      const n = uiPointsForIssue(d, 'minor');
      expect(c, `${d} critical`).toBeGreaterThan(m);
      expect(m, `${d} major`).toBeGreaterThanOrEqual(n);
    }
  });

  it('mapMissingIssueToDimension routes salary and skills titles', () => {
    expect(mapMissingIssueToDimension('Missing salary range')).toBe('completeness');
    expect(mapMissingIssueToDimension('Tech stack not listed')).toBe('skills');
    expect(mapMissingIssueToDimension('Vague daily duties')).toBe('responsibilities');
  });

  it('unified issue dimension and severity follow type rules', () => {
    expect(
      dimensionForUnifiedIssue({
        type: 'ambiguity',
        title: 'Anything',
      }),
    ).toBe('clarity');
    expect(severityForUnifiedIssue({ type: 'ambiguity', title: 'x' })).toBe('major');

    expect(
      dimensionForUnifiedIssue({
        type: 'unrealistic',
        title: 'Too senior',
      }),
    ).toBe('completeness');
    expect(severityForUnifiedIssue({ type: 'unrealistic', title: 'x' })).toBe('critical');

    expect(
      dimensionForUnifiedIssue({
        type: 'missing',
        title: 'Salary not shown',
      }),
    ).toBe('completeness');
    expect(severityForUnifiedIssue({ type: 'missing', title: 'x' })).toBe('major');
  });

  it('returns 0 normalized points for non-positive raw impact', () => {
    expect(normalizeImpactToUiPoints(0)).toBe(0);
    expect(normalizeImpactToUiPoints(-1)).toBe(0);
  });
});
