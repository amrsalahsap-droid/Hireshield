/**
 * Turns AI "improvement" copy into recruiter-facing text safe to append to rawJD.
 * Strips coaching / meta lines and applies light JD-shaped formatting by issue context.
 */

export type NormalizeJdSuggestionContext = {
  issueType: string;
  issueTitle: string;
  /** Optional extra signal from improve-section (not always sent on apply) */
  issueDescription?: string;
  targetSection?: string;
};

const FENCE_RE = /^```(?:json|text|markdown)?\s*\n?([\s\S]*?)\n?```$/im;

/** Standalone lines that are never JD content */
const DROP_LINE_RE = [
  /^#{1,6}\s*(generated\s+suggestion|suggestion|improvement|draft|output)\b.*$/i,
  /^\*{0,2}generated\s+suggestion\*{0,2}\s*:?\s*$/i,
  /^generated\s+suggestion\s*:?\s*$/i,
  /^suggestion\s*:?\s*$/i,
  /^(suggested\s+(change|text|copy|wording)|draft\s+text|paste[- ]ready\s+text)\s*:?\s*$/i,
  /^note:\s*(?:this|the following|here|that\s+you)\b/i,
  /^tip:\s*/i,
  /^important:\s*/i,
  /^\(optional\)\s*/i,
  /^keep\s+in\s+mind\s*[,:]?\s*$/i,
  /^consider\s+adding\s*:?\s*$/i,
  /^for\s+example\s*[,:]?\s*$/i,
  /^(specifically|alternatively)\s*[,:]?\s*$/i,
];

/** Lead-in phrases on a line — strip the line, keep rest */
const STRIP_PREFIX_LINE_RE = [
  /^here(?:'s| is)\s+(?:the|a)\s+(?:suggested|updated|revised)\s+.*?:\s*$/i,
  /^you can\s+(?:use|paste)\s+(?:the\s+following|this)\s*:?\s*$/i,
  /^(?:the\s+following|below\s+is)\s+(?:is\s+)?(?:a\s+)?(?:suggested|updated|revised)\s+.*?:\s*$/i,
];

function trimAndUnfence(text: string): string {
  let t = text.trim().replace(/\r\n/g, "\n");
  const m = t.match(FENCE_RE);
  if (m) t = m[1].trim();
  return t;
}

function stripLabeledBlock(text: string, label: RegExp): string | null {
  const m = text.match(label);
  if (m && m[1]) return m[1].trim();
  return null;
}

/**
 * If the model used "For example:" / "Suggested wording:", keep only the example/snippet portion.
 */
function extractAfterMetaLabels(text: string): string {
  const patterns: RegExp[] = [
    /(?:^|\n)\s*(?:suggested\s+wording|recommended\s+wording|draft\s+text|job\s+description\s+(?:snippet|text)|paste[- ]ready\s+content)\s*:\s*\n([\s\S]+)/i,
    /(?:^|\n)\s*for\s+example\s*[,:]?\s*\n([\s\S]+)/i,
    /(?:^|\n)\s*for\s+example\s*[,:]\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
    /(?:^|\n)\s*replace\s+(?:the\s+)?(?:vague|ambiguous)\s+[^.:\n]+[.:]\s*\n([\s\S]+)/i,
    // Inline: "For example: bullet text" on one line
    /(?:^|\n)\s*[^\n]*?\bfor\s+example\s*[,:]\s*(.+)$/im,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return text;
}

/**
 * Remove opening coaching paragraph(s): short blocks full of imperatives before real JD material.
 */
function stripSalaryCoachingPrefix(sentence: string): string {
  let t = sentence.trim();
  if (!/\$[\d,]+/.test(t)) return t;
  t = t.replace(
    /^(?:we\s+recommend|we\s+suggest)\s+(?:adding\s+(?:a\s+)?)?(?:that\s+you\s+)?(?:include\s+)?/i,
    ""
  );
  t = t.replace(/^based\s+on\s+[^.]+?\.\s*/i, "");
  t = t.replace(/^(?:replace|add|include)\s+[^$]+?(?=\$)/i, "");
  if (/\$/.test(t) && /recommend|suggest|salary\s+range\s+of/i.test(t.slice(0, 90))) {
    const i = t.indexOf("$");
    if (i > 0) t = t.slice(i);
  }
  return t.trim();
}

function salvageCompensationFromCoaching(paragraph: string): string | null {
  if (!/\$[\d,]+/.test(paragraph)) return null;
  const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const kept = sentences
    .filter(
      (s) =>
        /\$[\d,]+/.test(s) ||
        /\b(401\s*\(?k\)?|health\s+insurance|dental|vision|PTO|paid\s+time\s+off|equity|RSU|bonus|benefits?)\b/i.test(
          s
        )
    )
    .map((s) => stripSalaryCoachingPrefix(s));
  if (!kept.length) return null;
  return kept.join(" ").trim();
}

function stripLeadingCoachingParagraphs(text: string): string {
  const parts = text.split(/\n{2,}/);
  let start = 0;
  const coachingRe =
    /\b(replace|consider|add|remove|review|adjust|clarify|instead\s+of|we\s+recommend|we\s+suggest|you\s+should|try\s+to|make\s+sure|ensure\s+that|focus\s+on)\b/i;

  while (start < parts.length) {
    const p = parts[start].trim();
    if (!p) {
      start++;
      continue;
    }
    const lines = p.split("\n");
    const looksLikeBullets = lines.some((l) => /^[\s]*[•\-*]\s+\S/.test(l));
    const hasExperienceYears = /\d+\s*[-–]\s*\d+\s*(?:years?|yrs?)\b/i.test(p);
    const looksLikeJdSnippet =
      looksLikeBullets ||
      hasExperienceYears ||
      /^\s*#{1,6}\s+\S/.test(p);
    // Do not treat "$..." alone as JD-done: coaching paragraphs often mention salary.
    if (looksLikeJdSnippet || p.length > 360) break;
    const explanatoryLeadIn =
      /^(?:this\s+section|the\s+following|below)\s+(?:should|could|would|will|is)\b/i.test(p) ||
      /^in\s+order\s+to\b/i.test(p);
    if (
      (coachingRe.test(p) || explanatoryLeadIn) &&
      !/^[\s]*[•\-*]\s/m.test(p)
    ) {
      const salvaged = salvageCompensationFromCoaching(p);
      if (salvaged) {
        parts[start] = salvaged;
        break;
      }
      start++;
      continue;
    }
    break;
  }
  return parts.slice(start).join("\n\n").trim();
}

function filterLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let line of lines) {
    const t = line.trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (DROP_LINE_RE.some((re) => re.test(t))) continue;
    if (STRIP_PREFIX_LINE_RE.some((re) => re.test(t))) continue;
    // Drop single-line pure imperatives that are clearly instructions
    if (
      /^(replace|rewrite|update|edit|delete|remove)\s+(the|this|your)\s+/i.test(t) &&
      t.length < 160 &&
      !/[•\-*]\s/.test(t)
    ) {
      continue;
    }
    // Longer "Replace the vague …" coaching lines (no bullets)
    if (
      /^replace\s+the\s+/i.test(t) &&
      t.length < 280 &&
      !/^[\s]*[•\-*]\s/m.test(t)
    ) {
      continue;
    }
    if (
      /^replace\s+your\s+/i.test(t) &&
      t.length < 220 &&
      !/^[\s]*[•\-*]\s/m.test(t)
    ) {
      continue;
    }
    if (/^consider\s+(adding|including|updating)\b/i.test(t) && t.length < 200 && !/[•\-*]\s/.test(t)) {
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractQuotedSnippet(text: string): string | null {
  const dq = text.match(/"([^"]{20,})"/);
  if (dq) return dq[1].trim();
  const smart = text.match(/\u201c([^\u201d]{20,})\u201d/);
  if (smart) return smart[1].trim();
  return null;
}

function isResponsibilityContext(ctx: NormalizeJdSuggestionContext): boolean {
  const h = `${ctx.issueTitle} ${ctx.issueDescription ?? ""}`.toLowerCase();
  return (
    /\bresponsibilit|vague|bullet|daily\s+task|ambiguous|placeholder|duties|what\s+you(?:'ll|\s+will)\s+do\b/.test(
      h
    ) || (ctx.issueType === "ambiguity" && /\bvague|placeholder|responsibilit/.test(h))
  );
}

/** Normalize bullets to • and ensure one item per non-empty line */
function formatAsResponsibilityBullets(body: string): string {
  const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];

  const pushItem = (s: string) => {
    const x = s.replace(/^[\s•\-*]+\s*/, "").trim();
    if (x.length > 8) items.push(`• ${x}`);
  };

  if (lines.length) {
    for (const line of lines) {
      if (/^[\s]*[•\-*]\s+/.test(line)) {
        pushItem(line);
        continue;
      }
      const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z(])/);
      for (const s of sentences) {
        const t = s.trim();
        if (t.length > 15) pushItem(t);
      }
    }
  }

  if (items.length === 0) {
    const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
    for (const s of sentences.slice(0, 12)) pushItem(s);
  }

  return items.length ? items.join("\n") : body.trim();
}

/**
 * Exported for tests / reuse.
 */
export function normalizeJdSuggestionForRawJd(
  raw: string,
  ctx: NormalizeJdSuggestionContext
): string {
  if (!raw || !raw.trim()) return "";

  let text = trimAndUnfence(raw);

  // Prefer explicit labeled blocks if present
  const labeled =
    stripLabeledBlock(text, /(?:^|\n)\s*(?:jd[- ]?ready\s+text|final\s+text)\s*:\s*\n([\s\S]+)/i) ??
    stripLabeledBlock(text, /(?:^|\n)\s*(?:suggested\s+wording)\s*:\s*\n([\s\S]+)/i);
  if (labeled) text = labeled;

  text = extractAfterMetaLabels(text);
  text = stripLeadingCoachingParagraphs(text);
  text = filterLines(text);

  // If still mostly coaching, try quoted snippet
  if (
    text.length > 400 &&
    /\b(replace|consider|instead\s+of|we\s+recommend)\b/i.test(text.slice(0, 280)) &&
    !/^[\s]*[•\-*]/m.test(text)
  ) {
    const q = extractQuotedSnippet(text);
    if (q && q.length > 25) text = q;
  }

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";

  // Body only: section titles come from insertJdSuggestionIntoRawJd (defaultHeading / merge),
  // avoiding double headings (e.g. "Compensation" here + "Compensation & Benefits" there).
  if (isResponsibilityContext(ctx) && ctx.issueType !== "missing") {
    const bullets = formatAsResponsibilityBullets(text);
    if (bullets) text = bullets;
  }

  return text.trim();
}
