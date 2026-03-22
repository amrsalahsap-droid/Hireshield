/**
 * Shared system prompt, user prompt, parsing, and normalization for refineJobDescription across LLM providers.
 */

import type { RefineJDInput, RefineJDResult } from "./types";

const JD_MAX_CHARS = 12000;

/** System message for Groq/OpenRouter refine calls — keeps JSON shape while enforcing posting-only body text. */
export const REFINE_JOB_DESCRIPTION_SYSTEM_MESSAGE = `You are HireShield's job-posting editor. You MUST respond with one valid JSON object only (no markdown outside the JSON).

The string value of "refinedJobDescription" is pasted directly into a live job posting. It must read like a polished employer-written job ad: only what candidates and recruiters should see on the posting.

Never put explanations, process notes, assistant chit-chat, or section labels meant for the model inside "refinedJobDescription". Put every non-posting remark only in "summary" or "changesMade".`;

/**
 * Builds the full user-message prompt for full-JD refinement.
 */
export function buildRefineJobDescriptionUserPrompt(input: RefineJDInput): string {
  const raw = input.rawJD || "";
  const jdBody =
    raw.length <= JD_MAX_CHARS
      ? raw
      : `${raw.slice(0, JD_MAX_CHARS)}\n\n[… JD truncated …]`;

  const extractionNote = input.extraction
    ? `
Prior structured analysis (context only — do not treat as new facts; do not invent details not supported by the JD below):
${JSON.stringify(
  {
    roleTitle: input.extraction.roleTitle,
    seniorityLevel: input.extraction.seniorityLevel,
    requiredSkills: input.extraction.requiredSkills?.slice(0, 16),
    keyResponsibilities: input.extraction.keyResponsibilities?.slice(0, 8),
    qualifications: input.extraction.qualifications?.slice(0, 8),
  },
  null,
  2
).slice(0, 4000)}
`
    : "";

  return `Refine the FULL job description below into a single recruiter-facing posting.

OUTPUT FORMAT (required — exactly one JSON object, no text before or after):
{"refinedJobDescription":"<string>","summary":"<string>","changesMade":["<string>",...]}

1) FIELD "refinedJobDescription" (the posting itself)
- Content ONLY: what should appear on the job board (title line if appropriate, sections, bullets, paragraphs).
- Voice: neutral third-person employer ("We", "The team", role name) — not "I", not "the assistant", not "below you will find".
- Structure: use clear sections with consistent Markdown headings (## / ###) such as Overview, Key responsibilities, Requirements, Nice to have, Benefits (only if present in source), Location, etc. Merge overlapping sections; normalize heading wording and casing.
- Editing: remove duplicate and near-duplicate bullets/lines/paragraphs; merge related ideas; fix grammar and unclear phrasing without changing meaning.
- Facts: preserve intent, role, level, domain, and every fact supported by the source (skills, tools, locations, comp, reporting, team context only if stated). Do not add salary, benefits, equity, perks, DEI pledges, company history, team size, or requirements not grounded in the source.
- FORBIDDEN inside this string (examples — never include these or anything like them):
  * Preambles: "Here is the refined version", "Below is", "I've improved", "Generated suggestion", "I updated the JD", "Here you go"
  * Meta: "Changes I made", "Summary of edits", "Note to hiring manager", "Let me know if"
  * Wrapping the whole JD in a markdown code fence
  * Placeholders unless they were already in the source
- Start the string with the actual posting content (e.g. role title or first section heading), not with commentary.

2) FIELD "summary"
- 1–3 sentences: high-level description of structural/readability edits only. Not a copy of the JD. No bullet list.

3) FIELD "changesMade"
- 4–12 short strings: concrete edits in past tense or gerund form (e.g. "Removed duplicate bullets under Requirements", "Merged overlapping About and Role sections", "Normalized headings to sentence case").

Role title (alignment only; must match source intent): ${input.jobTitle.trim()}
${extractionNote}
--- SOURCE JOB DESCRIPTION (edit this; preserve supported facts) ---
${jdBody}
---

Respond with the single JSON object only.`;
}

/** Lines that are clearly assistant/meta, not job-posting copy (applied to start/end of refined JD). */
const LEADING_META_LINE_RE =
  /^(here'?s|here is|here are)\s+(the\s+)?(refined|updated|improved|revised|rewritten|polished|final|complete)\b/i;
const LEADING_META_LINE_RE2 =
  /^(below|above)\s+(is|you\s+will\s+find|I've\s+placed)\b/i;
const LEADING_META_LINE_RE3 =
  /^this\s+is\s+(the\s+)?(refined|updated|improved|revised|rewritten|polished|new|final)\b/i;
const LEADING_META_LINE_RE4 = /^i'?ve?\s+(refined|updated|revised|rewritten|improved|polished|prepared)\b/i;
const LEADING_META_LINE_RE5 = /^i\s+have\s+(refined|updated|revised|rewritten|improved|polished|prepared)\b/i;
const LEADING_META_LINE_RE6 = /^generated\s+(suggestion|content|output|version|jd|job\s+description|posting)\b/i;
const LEADING_META_LINE_RE7 =
  /^(refined|updated|improved)\s+(job\s+description|jd|version|posting)\s*:?\s*$/i;
const LEADING_META_LINE_RE8 = /^\*{0,2}\s*refined\s+(job\s+description|jd|posting)\s*\*{0,2}\s*$/i;
const LEADING_META_LINE_RE9 = /^#{1,6}\s*(refined|updated|improved)\s+(job\s+description|jd|version)\s*$/i;

const TRAILING_META_LINE_RE =
  /^(let\s+me\s+know|feel\s+free\s+to|hope\s+this\s+helps|if\s+you\s+need\s+any\s+further)\b/i;
const TRAILING_META_LINE_RE2 = /^(note\s+to\s+(the\s+)?(hiring\s+manager|recruiter)\s*:?)\s*$/i;

function isLeadingMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^---+(\s*)$/.test(t) || /^\*{3,}$/.test(t)) return true;
  return (
    LEADING_META_LINE_RE.test(t) ||
    LEADING_META_LINE_RE2.test(t) ||
    LEADING_META_LINE_RE3.test(t) ||
    LEADING_META_LINE_RE4.test(t) ||
    LEADING_META_LINE_RE5.test(t) ||
    LEADING_META_LINE_RE6.test(t) ||
    LEADING_META_LINE_RE7.test(t) ||
    LEADING_META_LINE_RE8.test(t) ||
    LEADING_META_LINE_RE9.test(t)
  );
}

function isTrailingMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  return TRAILING_META_LINE_RE.test(t) || TRAILING_META_LINE_RE2.test(t);
}

/**
 * If the model wrapped the JD in a single markdown fence, unwrap it.
 */
function unwrapMarkdownFences(text: string): string {
  const t = text.trim();
  const block = t.match(/^```(?:markdown|md|txt|text)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  if (block) return block[1].trim();
  return text;
}

/**
 * Remove common assistant preambles/postambles from the posting body only.
 */
function stripAssistantMetaFromRefinedBody(text: string): string {
  let s = unwrapMarkdownFences(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  const lines = s.split("\n");
  let start = 0;
  let guard = 0;
  while (start < lines.length && guard++ < 12) {
    if (isLeadingMetaLine(lines[start] ?? "")) start++;
    else break;
  }
  let end = lines.length;
  guard = 0;
  while (end > start && guard++ < 8) {
    if (isTrailingMetaLine(lines[end - 1] ?? "")) end--;
    else break;
  }
  s = lines.slice(start, end).join("\n");
  return s.trim();
}

function normalizeRefinedBody(text: string): string {
  let s = stripAssistantMetaFromRefinedBody(text);
  // Trim accidental wrapping quotes from model
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length > 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length > 2)
  ) {
    s = s.slice(1, -1);
  }
  s = s.replace(/\n{4,}/g, "\n\n\n").trim();
  return s;
}

const SUMMARY_LEADING_META_RE =
  /^(here'?s|here is|i'?ve?\s+(refined|updated)|this\s+summary)\b/i;

function normalizeSummary(text: string): string {
  let t = text.replace(/\r\n/g, " ").replace(/\s+/g, " ").trim();
  if (SUMMARY_LEADING_META_RE.test(t)) {
    t = t.replace(SUMMARY_LEADING_META_RE, "").trim();
  }
  if (t.length > 1200) return `${t.slice(0, 1197)}…`;
  return t;
}

const CHANGES_NOISE_RE = /^generated\s+suggestion\b/i;

function normalizeChangesMade(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ["Restructured the posting for clarity and flow"];
  }
  const items = value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0 && s.length <= 400 && !CHANGES_NOISE_RE.test(s));
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const s of items) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
    if (deduped.length >= 40) break;
  }
  return deduped.length > 0
    ? deduped
    : ["Restructured the posting for clarity and flow"];
}

/**
 * Parse JSON from model output and return a normalized RefineJDResult.
 */
export function parseAndNormalizeRefineJobDescriptionContent(
  content: string
): RefineJDResult {
  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid JSON in refine job description response");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Refine response must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  let refined = "";
  if (typeof obj.refinedJobDescription === "string") {
    refined = obj.refinedJobDescription;
  } else if (typeof obj.refined_job_description === "string") {
    refined = obj.refined_job_description;
  } else if (typeof obj.jobDescription === "string") {
    refined = obj.jobDescription;
  }

  refined = normalizeRefinedBody(refined);
  if (!refined) {
    throw new Error("Missing refinedJobDescription");
  }

  const summaryRaw =
    typeof obj.summary === "string"
      ? obj.summary
      : typeof obj.changeSummary === "string"
        ? obj.changeSummary
        : "";
  const summary =
    normalizeSummary(summaryRaw) ||
    "Restructured and deduplicated the posting, normalized headings, and improved readability while preserving stated facts.";

  const changesMade = normalizeChangesMade(obj.changesMade);

  return {
    refinedJobDescription: refined,
    summary,
    changesMade,
  };
}
