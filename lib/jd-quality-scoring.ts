/**
 * JD quality score breakdown: content-aware, graduated formula.
 *
 * Scoring dimensions: clarity (25), completeness (35), skills (20), responsibilities (20).
 * Uses structured extraction fields when available, with rawJD content detection as
 * fallback so the score responds to content additions even when the AI extraction
 * doesn't populate structured fields (e.g. estimatedSalary, department).
 */

import {
  type JdScoreDimension,
  mapMissingIssueToDimension,
} from './jd-improvement-scoring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UnifiedIssue = {
  type: 'ambiguity' | 'unrealistic' | 'missing';
  title: string;
  priority: number;
};

export type ScoreBreakdown = Record<JdScoreDimension, number>;

// ---------------------------------------------------------------------------
// Raw-JD content signals
// ---------------------------------------------------------------------------

export const JD_CONTENT_SIGNALS = {
  salary: /\$[\d,]+|\bsalary\s+range\b|\bcompensation\b.*\brange\b|\bbase\s+pay\b|\bper\s+(year|annum)\b/i,
  location: /\bremote\b|\bhybrid\b|\bon[- ]?site\b|\bwork\s+from\s+home\b|\boffice\s+location\b/i,
  benefits: /\b401\(?k\)?\b|\bbenefits\b.*\binclude\b|\bmedical\b.*\b(?:dental|vision)\b|\bpto\b|\bpaid\s+time\s+off\b/i,
  department: /\bdepartment\b|\bteam\b.*\b(?:join|report)\b|\breporting\s+to\b/i,
  experience: /\b\d+[+]?\s*years?\s+(?:of\s+)?experience\b/i,
  preferred: /\bpreferred\b|\bnice[- ]to[- ]have\b|\bbonus\s+(?:if|points?)\b/i,
} as const;

export function jdHasSignal(rawJD: string | undefined, key: keyof typeof JD_CONTENT_SIGNALS): boolean {
  if (!rawJD) return false;
  return JD_CONTENT_SIGNALS[key].test(rawJD);
}

// ---------------------------------------------------------------------------
// Score breakdown
// ---------------------------------------------------------------------------

export function computeScoreBreakdown(
  extraction: any,
  activeIssues: UnifiedIssue[],
  rawJD?: string,
): ScoreBreakdown {
  const ambiguityCount = activeIssues.filter((i) => i.type === 'ambiguity').length;
  const unrealisticCount = activeIssues.filter((i) => i.type === 'unrealistic').length;

  let clarPen = 0;
  let compPen = 0;
  let skillsPen = 0;
  let respPen = 0;
  for (const issue of activeIssues) {
    if (issue.type !== 'missing') continue;
    const dim = mapMissingIssueToDimension(issue.title);
    if (dim === 'completeness') compPen += 3;
    else if (dim === 'skills') skillsPen += 3;
    else if (dim === 'responsibilities') respPen += 3;
    else clarPen += 3;
  }

  // Clarity (max 25)
  let clarity = 8;
  const hasSeniority =
    extraction.seniorityLevel &&
    extraction.seniorityLevel !== 'UNKNOWN';
  if (hasSeniority) clarity += 4;
  if (extraction.department) clarity += 4;
  else if (jdHasSignal(rawJD, 'department')) clarity += 2;
  if (extraction.experienceLevel) clarity += 2;
  else if (jdHasSignal(rawJD, 'experience')) clarity += 1;
  clarity -= ambiguityCount * 3;
  clarity -= clarPen;

  // Completeness (max 35)
  let completeness = 6;
  const nQuals = extraction.qualifications?.length ?? 0;
  completeness += Math.min(8, nQuals * 2);
  if (extraction.estimatedSalary) completeness += 8;
  else if (jdHasSignal(rawJD, 'salary')) completeness += 4;
  if (jdHasSignal(rawJD, 'location')) completeness += 3;
  if (jdHasSignal(rawJD, 'benefits')) completeness += 3;
  completeness -= unrealisticCount * 5;
  completeness -= compPen;

  // Skills (max 20)
  const nSkills = extraction.requiredSkills?.length ?? 0;
  let skills = nSkills > 0 ? Math.min(20, 2 + Math.min(18, nSkills * 2)) : 0;
  if (extraction.preferredSkills?.length > 0) skills += 2;
  skills -= skillsPen;

  // Responsibilities (max 20)
  const kr = extraction.keyResponsibilities?.length ?? 0;
  let responsibilities = Math.min(14, Math.round(kr * 2.5));
  if (extraction.preferredQualifications?.length > 0) responsibilities += 3;
  else if (jdHasSignal(rawJD, 'preferred')) responsibilities += 1;
  responsibilities -= respPen;

  return {
    clarity: Math.max(0, Math.min(25, clarity)),
    completeness: Math.max(0, Math.min(35, completeness)),
    skills: Math.max(0, Math.min(20, skills)),
    responsibilities: Math.max(0, Math.min(20, responsibilities)),
  };
}

// ---------------------------------------------------------------------------
// Aggregate score
// ---------------------------------------------------------------------------

export function computeQualityScore(
  extraction: any,
  activeIssues: UnifiedIssue[],
  rawJD?: string,
): number {
  if (!extraction) return 0;
  const b = computeScoreBreakdown(extraction, activeIssues, rawJD);
  return Math.max(
    0,
    Math.min(100, b.clarity + b.completeness + b.skills + b.responsibilities),
  );
}
