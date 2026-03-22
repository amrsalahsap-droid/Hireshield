import { describe, expect, it } from "vitest";
import { normalizeJdSuggestionForRawJd } from "./normalize-jd-suggestion";

describe("normalizeJdSuggestionForRawJd", () => {
  it("strips Generated Suggestion header and coaching intro", () => {
    const raw = `Generated Suggestion

Replace the vague bullets with specifics. For example:

• Ship customer-facing features end-to-end
• Partner with design on discovery`;

    const out = normalizeJdSuggestionForRawJd(raw, {
      issueType: "ambiguity",
      issueTitle: "Vague responsibilities",
    });
    expect(out).not.toMatch(/generated suggestion/i);
    expect(out).not.toMatch(/^replace\b/i);
    expect(out).toMatch(/Ship customer-facing/);
    expect(out).toMatch(/^•/m);
  });

  it("keeps compensation dollars when salvaging from coaching paragraph", () => {
    const raw = `We recommend adding a salary range of $85,000–$120,000 per year. Benefits include health insurance and 401(k).`;
    const out = normalizeJdSuggestionForRawJd(raw, {
      issueType: "missing",
      issueTitle: "Missing salary",
    });
    expect(out).toMatch(/\$85,000/);
    expect(out).not.toMatch(/we recommend/i);
  });

  it("adds section heading for skills context", () => {
    const raw = `React, TypeScript, Node.js, PostgreSQL`;
    const out = normalizeJdSuggestionForRawJd(raw, {
      issueType: "missing",
      issueTitle: "Missing technical skills",
    });
    expect(out).toMatch(/Skills & Technologies/i);
    expect(out).toMatch(/React/);
  });

  it("strips Replace/For example coaching and keeps bullets", () => {
    const raw = `Replace the vague responsibility bullets with specifics.

For example:

• Own discovery through launch for assigned features
• Partner with design on UX tradeoffs`;

    const out = normalizeJdSuggestionForRawJd(raw, {
      issueType: "ambiguity",
      issueTitle: "Vague responsibilities",
    });
    expect(out).not.toMatch(/^replace\b/im);
    expect(out).not.toMatch(/for example/i);
    expect(out).toMatch(/Own discovery/);
    expect(out).toMatch(/^•/m);
  });

  it("adds work arrangement heading for environment-style issues", () => {
    const raw = `This role is hybrid in Austin with core hours 10–4 CT and quarterly travel for team weeks.`;
    const out = normalizeJdSuggestionForRawJd(raw, {
      issueType: "missing",
      issueTitle: "Work environment not described",
    });
    expect(out).toMatch(/Location & Work Arrangement/i);
    expect(out).toMatch(/hybrid/i);
  });
});
