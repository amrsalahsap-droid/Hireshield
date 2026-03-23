/**
 * Merges normalized JD suggestion text into rawJD at the right section.
 * Line-based heuristics for common plain-text / light-markdown job descriptions.
 */

import type { NormalizeJdSuggestionContext } from "@/lib/server/normalize-jd-suggestion";

export type InsertionContext = NormalizeJdSuggestionContext;

export type InsertTarget =
  | "responsibilities"
  | "skills"
  | "compensation"
  | "work_environment"
  | "opening";

/** One regex per variant; tested against trimmed line with optional leading # stripped */
function normalizeHeaderLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*+\s*/, "")
    .replace(/\*+$/g, "")
    .trim();
}

function lineMatches(line: string, patterns: RegExp[]): boolean {
  const n = normalizeHeaderLine(line);
  if (!n) return false;
  return patterns.some((p) => p.test(n) || p.test(line.trim()));
}

/** Headers that start a new major JD block (used to find section boundaries). */
const MAJOR_SECTION_PATTERNS: RegExp[] = [
  /^(key\s+)?responsibilities\b/i,
  /^roles?\s+and\s+responsibilities\b/i,
  /^what\s+you(?:'ll|ll)\s+do\b/i,
  /^principal\s+(duties|responsibilities)\b/i,
  /^requirements\b/i,
  /^qualifications\b/i,
  /^(required\s+)?skills\b/i,
  /^technical\s+skills\b/i,
  /^must[- ]haves?\b/i,
  /^nice[- ]to[- ]haves?\b/i,
  /^education\b/i,
  /^experience\b/i,
  /^compensation\b/i,
  /^salary\b/i,
  /^pay\s+range\b/i,
  /^benefits?\b/i,
  /^perks?\b/i,
  /^work\s+environment\b/i,
  /^work\s+(setup|arrangement)\b/i,
  /^location\b/i,
  /^remote\b/i,
  /^hybrid\b/i,
  /^about\s+(the\s+)?(role|position|company)\b/i,
  /^about\s+the\s+role\b/i,
  /^overview\b/i,
  /^position\s+summary\b/i,
  /^role\s+summary\b/i,
  /^the\s+opportunity\b/i,
  /^summary\b/i,
  /^what\s+we\s+offer\b/i,
  /^how\s+to\s+apply\b/i,
  /^to\s+apply\b/i,
];

function isMajorSectionHeader(line: string): boolean {
  const n = normalizeHeaderLine(line);
  if (n.length < 3 || n.length > 80) return false;
  if (MAJOR_SECTION_PATTERNS.some((p) => p.test(n))) return true;
  // ALL CAPS title line (common in JDs), not a bullet
  if (/^[\s•\-*]/.test(line)) return false;
  if (/^[A-Z0-9][A-Z0-9\s,&/-]{6,60}$/.test(n) && n === n.toUpperCase()) return true;
  return false;
}

const RESP_PATTERNS = [
  /^(key\s+)?responsibilities$/i,
  /^roles?\s+and\s+responsibilities$/i,
  /^what\s+you(?:'ll|ll)\s+do$/i,
  /^principal\s+(duties|responsibilities)$/i,
];

const SKILLS_PATTERNS = [
  /^requirements$/i,
  /^qualifications$/i,
  /^(required\s+)?skills$/i,
  /^technical\s+skills$/i,
  /^skills\s*&\s*technologies$/i,
  /^must[- ]haves?$/i,
  /^education\s*&\s*experience$/i,
];

const COMP_PATTERNS = [
  /^compensation(\s*[&+]\s*benefits)?$/i,
  /^salary$/i,
  /^pay\s+range$/i,
  /^benefits?$/i,
  /^what\s+we\s+offer$/i,
];

const WORK_ENV_PATTERNS = [
  /^work\s+environment$/i,
  /^work\s+(setup|arrangement)$/i,
  /^location$/i,
  /^remote\s*[,&/]\s*hybrid/i,
];

const OPENING_PATTERNS = [
  /^about\s+(the\s+)?(role|position)$/i,
  /^about\s+the\s+role$/i,
  /^overview$/i,
  /^position\s+summary$/i,
  /^role\s+summary$/i,
  /^summary$/i,
  /^the\s+role$/i,
  /^the\s+opportunity$/i,
];

function patternsForTarget(target: InsertTarget): RegExp[] {
  switch (target) {
    case "responsibilities":
      return RESP_PATTERNS;
    case "skills":
      return SKILLS_PATTERNS;
    case "compensation":
      return COMP_PATTERNS;
    case "work_environment":
      return WORK_ENV_PATTERNS;
    case "opening":
      return OPENING_PATTERNS;
    default:
      return [];
  }
}

function defaultHeading(target: InsertTarget): string {
  switch (target) {
    case "responsibilities":
      return "Key Responsibilities";
    case "skills":
      return "Requirements";
    case "compensation":
      return "Compensation & Benefits";
    case "work_environment":
      return "Work Environment";
    case "opening":
      return "About the Role";
    default:
      return "";
  }
}

/**
 * Maps issue text + type to where the suggestion belongs in the JD.
 * Order: compensation → work env → skills → responsibilities → opening.
 */
export function classifyInsertionTarget(ctx: InsertionContext): InsertTarget {
  const t = `${ctx.issueTitle} ${ctx.targetSection ?? ""} ${ctx.issueDescription ?? ""}`.toLowerCase();

  if (ctx.targetSection?.trim()) {
    const ts = ctx.targetSection.toLowerCase();
    // Salary/comp wins over skills when both appear in a combined hint.
    if (/salary|compensation|pay|benefit/.test(ts)) return "compensation";
    if (/remote|hybrid|location|environment|on[- ]?site|office|work\s+setup/.test(ts)) return "work_environment";
    if (/role\s+summary|about\s+the\s+role|position\s+summary/.test(ts)) return "opening";
    if (/skill|requirement|qualification|technology|stack/.test(ts)) return "skills";
    if (/responsibilit|duty|what\s+you/.test(ts)) return "responsibilities";
  }

  if (/\bsalary\b|\bcompensation\b|\bpay\s+range\b|\bbenefits?\b|\b401k\b|\bequity\b|\bpto\b/.test(t)) {
    return "compensation";
  }
  if (
    /\bremote\b|\bhybrid\b|\bon[- ]?site\b|\blocation\b|\bwork\s+environment\b|\bwork\s+setup\b|\btimezone\b|\boffice\b/.test(
      t
    )
  ) {
    return "work_environment";
  }
  if (
    /\bskills?\b|\btechnolog\b|\bstack\b|\bqualification\b|\brequirements?\b|\bmust[- ]have\b|\beducation\b/.test(t) &&
    !/\bresponsibilit\b/.test(t)
  ) {
    return "skills";
  }
  if (
    /\bresponsibilit\b|\bvague\b|\bplaceholder\b|\bdut(y|ies)\b|\bday[- ]?to[- ]?day\b|\bwhat\s+you(?:'ll|ll)\s+do\b/.test(
      t
    )
  ) {
    return "responsibilities";
  }
  if (
    /\bculture\b|\bteam\b|\babout\s+the\s+role\b|\bcompany\b|\bmission\b|\bwho\s+we\s+are\b|\boverview\b|\bposition\s+summary\b|\broles?\s+summary\b|\bthe\s+opportunity\b/.test(
      t
    )
  ) {
    return "opening";
  }

  if (ctx.issueType === "ambiguity") return "responsibilities";
  if (ctx.issueType === "unrealistic") {
    if (/\bskill\b|\btechnolog\b|\bexperience\b/.test(t)) return "skills";
    return "opening";
  }
  return "opening";
}

function findFirstSectionLineIndex(lines: string[], patterns: RegExp[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lineMatches(lines[i], patterns)) return i;
  }
  return -1;
}

function findFirstMajorSectionIndex(lines: string[], fromIndex: number): number {
  for (let i = fromIndex + 1; i < lines.length; i++) {
    const tr = lines[i].trim();
    if (!tr) continue;
    if (isMajorSectionHeader(lines[i])) return i;
  }
  return lines.length;
}

/** Last non-blank line index in [start, endInclusive], or start if none */
function lastNonEmptyInRange(lines: string[], start: number, endInclusive: number): number {
  for (let k = endInclusive; k >= start; k--) {
    if (lines[k]?.trim()) return k;
  }
  return start;
}

function joinWithSpacing(before: string, insert: string, after: string): string {
  const a = before.trimEnd();
  const b = insert.trim();
  const c = after.trimStart();
  let out = a;
  if (out && !out.endsWith("\n")) out += "\n";
  out += "\n" + b;
  if (c) {
    out += "\n\n" + c;
  }
  return out.replace(/\n{4,}/g, "\n\n\n").trimEnd() + (after.endsWith("\n") ? "\n" : "");
}

/** Collapse whitespace for comparing bullets/lines (duplicate detection). */
function normalizeLineForDedupe(line: string): string {
  const t = line.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.replace(/^[•\-*]\s+/, "").toLowerCase();
}

/** Drop consecutive duplicate lines (same normalized text). */
function dedupeLinesInBlock(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let prevKey = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      prevKey = "";
      continue;
    }
    const key = normalizeLineForDedupe(line);
    if (key && key === prevKey) continue;
    prevKey = key || prevKey;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Skip new lines that already appear in the target section (exact normalized match). */
function filterAgainstExistingSection(newBlock: string, existingSectionText: string): string {
  const existingKeys = new Set(
    existingSectionText
      .split("\n")
      .map((l) => normalizeLineForDedupe(l))
      .filter(Boolean)
  );
  const lines = newBlock.split("\n");
  const out: string[] = [];
  const seenNew = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const key = normalizeLineForDedupe(line);
    if (key && existingKeys.has(key)) continue;
    if (key && seenNew.has(key)) continue;
    if (key) seenNew.add(key);
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function collapseExcessBlankLines(text: string): string {
  return text.replace(/\n{4,}/g, "\n\n\n").trimEnd();
}

/**
 * Remove first line if it duplicates the section heading we're inserting under.
 */
function stripRedundantHeading(content: string, target: InsertTarget): string {
  const lines = content.split(/\n/);
  if (!lines.length) return content;
  const first = normalizeHeaderLine(lines[0]);
  const checks: Record<InsertTarget, RegExp[]> = {
    responsibilities: [/^(key\s+)?responsibilities$/i, /^key\s+responsibilities$/i],
    skills: [/^requirements$/i, /^skills(\s*&\s*technologies)?$/i, /^qualifications$/i],
    compensation: [/^compensation(\s*[&+]\s*benefits)?$/i, /^compensation$/i, /^salary$/i],
    work_environment: [/^work\s+environment$/i, /^location$/i],
    opening: [
      /^about\s+(the\s+)?(role|position)$/i,
      /^about\s+the\s+role$/i,
      /^overview$/i,
      /^role\s+summary$/i,
      /^position\s+summary$/i,
    ],
  };
  if (checks[target].some((p) => p.test(first))) {
    return lines.slice(1).join("\n").replace(/^\n+/, "").trim();
  }
  return content.trim();
}

function appendInsideExistingSection(
  rawJD: string,
  headerPatterns: RegExp[],
  content: string,
  target: InsertTarget
): string | null {
  const lines = rawJD.replace(/\r\n/g, "\n").split("\n");
  const hi = findFirstSectionLineIndex(lines, headerPatterns);
  if (hi < 0) return null;

  const nextMajor = findFirstMajorSectionIndex(lines, hi);
  const endBody = nextMajor > hi + 1 ? nextMajor - 1 : lines.length - 1;
  const insertAfter = lastNonEmptyInRange(lines, hi, endBody);

  const sectionExisting = lines.slice(hi, endBody + 1).join("\n");
  let body = stripRedundantHeading(content, target);
  body = dedupeLinesInBlock(body);
  body = filterAgainstExistingSection(body, sectionExisting);
  if (!body.trim()) return rawJD;

  const before = lines.slice(0, insertAfter + 1).join("\n");
  const after = lines.slice(insertAfter + 1).join("\n");
  return joinWithSpacing(before, body, after);
}

/** When target section is missing: pick insertion index (line) for new block. */
function findAnchorForNewSection(lines: string[], target: InsertTarget): number {
  const idxResp = findFirstSectionLineIndex(lines, RESP_PATTERNS);
  const idxSkills = findFirstSectionLineIndex(lines, SKILLS_PATTERNS);
  const idxComp = findFirstSectionLineIndex(lines, COMP_PATTERNS);
  const idxWork = findFirstSectionLineIndex(lines, WORK_ENV_PATTERNS);
  const idxApply = findFirstSectionLineIndex(lines, [/^how\s+to\s+apply$/i, /^to\s+apply$/i]);

  const endResp = idxResp >= 0 ? findFirstMajorSectionIndex(lines, idxResp) : -1;
  const endSkills = idxSkills >= 0 ? findFirstMajorSectionIndex(lines, idxSkills) : -1;

  switch (target) {
    case "opening": {
      let startScan = 0;
      const firstLine = lines[0]?.trim() ?? "";
      if (firstLine.length > 0 && firstLine.length < 72 && !/[.!?]/.test(firstLine)) {
        startScan = 1;
      }
      let lastContent = Math.max(0, startScan);
      for (let i = startScan; i < lines.length; i++) {
        if (lines[i].trim()) lastContent = i;
        else if (lastContent >= startScan && i > startScan) break;
      }
      return lastContent;
    }
    case "responsibilities": {
      if (idxSkills >= 0) return Math.max(0, idxSkills - 1);
      if (idxComp >= 0) return Math.max(0, idxComp - 1);
      if (idxApply >= 0) return Math.max(0, idxApply - 1);
      return lines.length - 1;
    }
    case "skills": {
      if (idxResp >= 0 && endResp > idxResp) return Math.max(0, endResp - 1);
      if (idxComp >= 0) return Math.max(0, idxComp - 1);
      if (idxApply >= 0) return Math.max(0, idxApply - 1);
      return lines.length - 1;
    }
    case "work_environment": {
      if (idxSkills >= 0 && endSkills > idxSkills) return Math.max(0, endSkills - 1);
      if (idxResp >= 0 && endResp > idxResp) return Math.max(0, endResp - 1);
      if (idxComp >= 0) return Math.max(0, idxComp - 1);
      return lines.length - 1;
    }
    case "compensation": {
      if (idxApply >= 0) return Math.max(0, idxApply - 1);
      if (idxWork >= 0) return Math.max(0, idxWork - 1);
      return lines.length - 1;
    }
    default:
      return lines.length - 1;
  }
}

function insertNewSectionBlock(rawJD: string, target: InsertTarget, content: string): string {
  const lines = rawJD.replace(/\r\n/g, "\n").split("\n");
  let body = stripRedundantHeading(content, target);
  body = dedupeLinesInBlock(body);
  if (!body.trim()) return rawJD.replace(/\r\n/g, "\n");

  const heading = defaultHeading(target);
  const block = `${heading}\n\n${body}`.trim();

  if (lines.length === 0 || !lines.some((l) => l.trim())) {
    return block;
  }

  const anchor = findAnchorForNewSection(lines, target);
  const insertAfter = lastNonEmptyInRange(lines, 0, anchor);
  const before = lines.slice(0, insertAfter + 1).join("\n");
  const after = lines.slice(insertAfter + 1).join("\n");
  return joinWithSpacing(before, block, after);
}

/**
 * Merge JD-ready suggestion into existing rawJD at the correct section.
 */
export function insertJdSuggestionIntoRawJd(
  rawJD: string,
  jdReadyText: string,
  ctx: InsertionContext
): string {
  const content = jdReadyText.trim();
  if (!content) return rawJD;

  const target = classifyInsertionTarget(ctx);
  const patterns = patternsForTarget(target);

  const existing = appendInsideExistingSection(rawJD, patterns, content, target);
  if (existing !== null) return collapseExcessBlankLines(existing);

  return collapseExcessBlankLines(insertNewSectionBlock(rawJD, target, content));
}
