/**
 * Local (non-AI) fallback implementations for core operations.
 * Used when both primary and fallback providers are unavailable.
 */

import type {
  AnalyzeJDInput,
  AnalyzeJDResult,
  TargetedImprovementInput,
  TargetedImprovementResult,
  RefineJDInput,
  RefineJDResult,
} from './types';

// ---------------------------------------------------------------------------
// analyzeJD
// ---------------------------------------------------------------------------

const SENIORITY_KEYWORDS: Record<string, string[]> = {
  INTERN:    ['intern', 'internship', 'trainee', 'apprentice'],
  JUNIOR:    ['junior', 'jr', 'entry level', 'entry-level', 'associate', 'graduate'],
  MID:       ['mid', 'mid-level', 'intermediate'],
  SENIOR:    ['senior', 'sr', 'staff', 'principal'],
  LEAD:      ['lead', 'tech lead', 'team lead'],
  MANAGER:   ['manager', 'engineering manager', 'head of'],
  DIRECTOR:  ['director', 'vp', 'vice president'],
};

const SECTION_HEADING_RE =
  /^(?:#{1,3}\s*)?(?:key\s+)?(?:responsibilities|duties|what you(?:'ll| will) do|role overview)/i;
const REQUIREMENTS_HEADING_RE =
  /^(?:#{1,3}\s*)?(?:requirements|qualifications|what (?:we|you) (?:need|require|are looking for)|must.have|minimum qualifications)/i;
const PREFERRED_HEADING_RE =
  /^(?:#{1,3}\s*)?(?:preferred|nice.to.have|bonus|desired)/i;

function extractLinesUnderHeading(
  lines: string[],
  headingRe: RegExp,
  stopRe?: RegExp,
): string[] {
  const results: string[] = [];
  let capturing = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (capturing) continue;
      continue;
    }
    if (headingRe.test(trimmed)) {
      capturing = true;
      continue;
    }
    if (capturing && stopRe && stopRe.test(trimmed)) break;
    if (capturing && /^(?:#{1,3}\s|\*{2,}|[A-Z][A-Z ]{4,}:)/.test(trimmed)) break;
    if (capturing) {
      const cleaned = trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
      if (cleaned.length > 5) results.push(cleaned);
    }
  }
  return results;
}

function inferSeniority(title: string, jd: string): string {
  const combined = `${title} ${jd}`.toLowerCase();
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (keywords.some((kw) => combined.includes(kw))) return level;
  }
  return 'UNKNOWN';
}

function inferRoleTitle(jobTitle: string): string {
  return jobTitle
    .replace(/\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|intern)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || jobTitle;
}

function inferExperienceLevel(seniority: string): string {
  const map: Record<string, string> = {
    INTERN: '0-1 years',
    JUNIOR: '0-2 years',
    MID: '3-5 years',
    SENIOR: '5-8 years',
    LEAD: '7-10 years',
    MANAGER: '8+ years',
    DIRECTOR: '10+ years',
  };
  return map[seniority] ?? '3-5 years';
}

function detectMissingCriteria(jd: string): AnalyzeJDResult['missingCriteria'] {
  const lower = jd.toLowerCase();
  const checks: Array<{ pattern: string; missing: string; suggested: string }> = [
    { pattern: 'salary', missing: 'Salary range', suggested: 'Add a competitive salary range to attract qualified candidates' },
    { pattern: 'remote', missing: 'Work location / remote policy', suggested: 'Specify whether the role is on-site, hybrid, or remote' },
    { pattern: 'benefit', missing: 'Benefits information', suggested: 'Include details about benefits, perks, and compensation packages' },
    { pattern: 'team', missing: 'Team size / structure', suggested: 'Describe the team the hire will join and reporting structure' },
    { pattern: 'equal opportunity', missing: 'Equal opportunity statement', suggested: 'Add an equal opportunity / diversity statement' },
  ];
  return checks
    .filter((c) => !lower.includes(c.pattern))
    .map(({ missing, suggested }) => ({ missing, suggestedCriteria: suggested }));
}

export function localAnalyzeJD(input: AnalyzeJDInput): AnalyzeJDResult {
  const lines = input.rawJD.split('\n');
  const seniority = inferSeniority(input.jobTitle, input.rawJD);

  const responsibilities = extractLinesUnderHeading(lines, SECTION_HEADING_RE);
  const qualifications = extractLinesUnderHeading(lines, REQUIREMENTS_HEADING_RE);
  const preferredQualifications = extractLinesUnderHeading(lines, PREFERRED_HEADING_RE);

  const skillTokens = qualifications
    .flatMap((q) => q.split(/[,;]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 60);

  const missingCriteria = detectMissingCriteria(input.rawJD);

  return {
    roleTitle: inferRoleTitle(input.jobTitle),
    requiredSkills: skillTokens.slice(0, 10),
    preferredSkills: preferredQualifications.slice(0, 5),
    seniorityLevel: seniority,
    experienceLevel: inferExperienceLevel(seniority),
    keyResponsibilities: responsibilities.slice(0, 10),
    qualifications: qualifications.slice(0, 10),
    preferredQualifications: preferredQualifications.slice(0, 5),
    ambiguities: [],
    unrealisticExpectations: [],
    missingCriteria,
  };
}

// ---------------------------------------------------------------------------
// generateTargetedImprovement
// ---------------------------------------------------------------------------

/**
 * Templates produce JD-ready text (not coaching advice) so the normalize-jd-suggestion
 * pipeline keeps the content intact rather than stripping it as "coaching paragraphs."
 */
const IMPROVEMENT_TEMPLATES: Record<string, (desc: string) => string> = {
  missing: (d) => {
    const lower = d.toLowerCase();
    if (lower.includes('salary') || lower.includes('compensation'))
      return '## Compensation\n\nSalary range: $[MIN] – $[MAX] per year, depending on experience.\nComprehensive benefits package included.';
    if (lower.includes('responsibilit'))
      return '## Responsibilities\n\n- [Key responsibility 1]\n- [Key responsibility 2]\n- [Key responsibility 3]\n- [Key responsibility 4]\n- [Key responsibility 5]';
    if (lower.includes('qualification'))
      return '## Qualifications\n\n- [Required qualification 1]\n- [Required qualification 2]\n- [Required qualification 3]';
    if (lower.includes('preferred'))
      return '## Preferred Qualifications\n\n- [Nice-to-have 1]\n- [Nice-to-have 2]';
    if (lower.includes('skill'))
      return '## Required Skills\n\n- [Skill 1]\n- [Skill 2]\n- [Skill 3]\n- [Skill 4]\n- [Skill 5]';
    if (lower.includes('remote') || lower.includes('location') || lower.includes('work environment'))
      return '## Work Environment\n\nThis role is [remote / hybrid / on-site] based in [Location].\nFlexible working hours available.';
    if (lower.includes('benefit'))
      return '## Benefits\n\n- Health, dental, and vision insurance\n- [Additional benefit 1]\n- [Additional benefit 2]\n- Paid time off and holidays';
    if (lower.includes('team') || lower.includes('structure'))
      return '## Team\n\nYou will join a [size]-person [team name] team, reporting to the [title].\nThe team is responsible for [brief scope].';
    return `## ${d}\n\n- [Detail 1]\n- [Detail 2]\n- [Detail 3]`;
  },
  ambiguous: (d) =>
    `${d}:\n\n- Specific technologies: [list concrete tools and versions]\n- Measurable outcomes: [list quantifiable targets]\n- Clear expectations: [describe what success looks like]`,
  unrealistic: (d) =>
    `${d}\n\nRequired:\n- [Core requirement 1]\n- [Core requirement 2]\n\nPreferred:\n- [Nice-to-have that was previously required]`,
  vague: (d) =>
    `${d}:\n\n- [Specific detail 1]\n- [Specific detail 2]\n- [Measurable criterion]`,
  redundant: (d) =>
    `${d}\n\n- [Consolidated requirement 1]\n- [Consolidated requirement 2]`,
};

const DEFAULT_TEMPLATE = (d: string) =>
  `## ${d}\n\n- [Detail 1]\n- [Detail 2]\n- [Detail 3]`;

export function localGenerateTargetedImprovement(
  input: TargetedImprovementInput,
): TargetedImprovementResult {
  const templateFn = IMPROVEMENT_TEMPLATES[input.issueType.toLowerCase()] ?? DEFAULT_TEMPLATE;
  return {
    suggestion: templateFn(input.issueDescription),
    confidence: 'low',
    rationale: 'Generated from template while AI capacity is limited.',
  };
}

// ---------------------------------------------------------------------------
// refineJobDescription
// ---------------------------------------------------------------------------

const CANONICAL_HEADINGS: Record<string, string> = {
  'responsibilities':        'Responsibilities',
  'key responsibilities':    'Responsibilities',
  'duties':                  'Responsibilities',
  'requirements':            'Requirements',
  'minimum requirements':    'Requirements',
  'minimum qualifications':  'Requirements',
  'qualifications':          'Qualifications',
  'preferred qualifications':'Preferred Qualifications',
  'nice to have':            'Preferred Qualifications',
  'benefits':                'Benefits',
  'perks':                   'Benefits',
  'about us':                'About Us',
  'about the company':       'About Us',
  'about the role':          'About the Role',
  'overview':                'Overview',
  'role overview':           'Overview',
};

function normalizeHeading(line: string): string | null {
  const stripped = line
    .replace(/^#{1,3}\s*/, '')
    .replace(/[:*_]+$/g, '')
    .replace(/\*{1,2}/g, '')
    .trim();
  const key = stripped.toLowerCase();
  return CANONICAL_HEADINGS[key] ?? null;
}

export function localRefineJobDescription(input: RefineJDInput): RefineJDResult {
  const lines = input.rawJD.split('\n');
  const changesMade: string[] = [];

  // 1. Normalize section headings
  const normalized = lines.map((line) => {
    const canonical = normalizeHeading(line.trim());
    if (canonical && line.trim().toLowerCase() !== canonical.toLowerCase()) {
      return `## ${canonical}`;
    }
    return line;
  });

  // 2. Deduplicate consecutive identical/near-identical lines
  const deduped: string[] = [];
  let dedupCount = 0;
  for (let i = 0; i < normalized.length; i++) {
    const cur = normalized[i].trim().toLowerCase();
    const prev = i > 0 ? normalized[i - 1].trim().toLowerCase() : '';
    if (cur && cur === prev) {
      dedupCount++;
      continue;
    }
    deduped.push(normalized[i]);
  }
  if (dedupCount > 0) changesMade.push(`Removed ${dedupCount} duplicate line(s)`);

  // 3. Merge repeated heading blocks (keep content from both, remove second heading)
  const seenHeadings = new Set<string>();
  const merged: string[] = [];
  let mergeCount = 0;
  for (const line of deduped) {
    const canonical = normalizeHeading(line.trim());
    if (canonical) {
      if (seenHeadings.has(canonical)) {
        mergeCount++;
        continue;
      }
      seenHeadings.add(canonical);
    }
    merged.push(line);
  }
  if (mergeCount > 0) changesMade.push(`Merged ${mergeCount} repeated section heading(s)`);

  // 4. Normalize whitespace: collapse 3+ blank lines to 2, trim trailing spaces
  let blankRun = 0;
  let wsChangeCount = 0;
  const final: string[] = [];
  for (const line of merged) {
    const trimmed = line.trimEnd();
    if (trimmed === '') {
      blankRun++;
      if (blankRun <= 2) final.push('');
      else wsChangeCount++;
    } else {
      blankRun = 0;
      final.push(trimmed);
    }
  }
  if (wsChangeCount > 0) changesMade.push('Normalized excessive blank lines');

  // Trim leading/trailing blank lines
  while (final.length && final[0] === '') final.shift();
  while (final.length && final[final.length - 1] === '') final.pop();

  if (changesMade.length === 0) changesMade.push('No structural changes needed');

  return {
    refinedJobDescription: final.join('\n'),
    summary: changesMade.length > 1
      ? 'Basic cleanup: formatting, deduplication, and heading normalization applied.'
      : 'Minimal cleanup applied; job description was already well-structured.',
    changesMade,
  };
}
