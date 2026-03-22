import { describe, expect, it } from "vitest";
import { classifyInsertionTarget, insertJdSuggestionIntoRawJd } from "./jd-suggestion-insertion";

describe("classifyInsertionTarget", () => {
  it("classifies salary issues as compensation", () => {
    expect(
      classifyInsertionTarget({
        issueType: "missing",
        issueTitle: "Missing salary range",
      })
    ).toBe("compensation");
  });

  it("classifies skills issues as skills not responsibilities", () => {
    expect(
      classifyInsertionTarget({
        issueType: "missing",
        issueTitle: "Missing technical skills",
      })
    ).toBe("skills");
  });

  it("classifies remote/hybrid as work_environment", () => {
    expect(
      classifyInsertionTarget({
        issueType: "missing",
        issueTitle: "Remote work policy unclear",
      })
    ).toBe("work_environment");
  });
});

describe("insertJdSuggestionIntoRawJd", () => {
  it("appends inside existing Key Responsibilities before Requirements", () => {
    const jd =
      "Software Engineer\n\nKey Responsibilities\n\n• Build features\n\nRequirements\n\n• 3+ years experience";
    const out = insertJdSuggestionIntoRawJd(jd, "• Ship reliable, tested code to production weekly.", {
      issueType: "ambiguity",
      issueTitle: "Vague responsibilities",
    });
    expect(out).toContain("Ship reliable");
    expect(out.indexOf("Ship reliable")).toBeLessThan(out.indexOf("Requirements"));
  });

  it("creates Key Responsibilities before Requirements when missing", () => {
    const jd = "Software Engineer\n\nRequirements\n\n• TypeScript";
    const out = insertJdSuggestionIntoRawJd(jd, "• Own features end-to-end.", {
      issueType: "ambiguity",
      issueTitle: "Vague responsibilities",
    });
    expect(out).toMatch(/Key Responsibilities/);
    expect(out.indexOf("Key Responsibilities")).toBeLessThan(out.indexOf("Requirements"));
  });

  it("appends under Compensation when present", () => {
    const jd =
      "Engineer\n\nResponsibilities\n\n• Build\n\nCompensation\n\nBase range discussed in interview.";
    const out = insertJdSuggestionIntoRawJd(jd, "Benefits include medical, dental, and 401(k) match.", {
      issueType: "missing",
      issueTitle: "Missing salary information",
    });
    expect(out).toContain("401(k)");
    expect(out.indexOf("401(k)")).toBeGreaterThan(out.indexOf("Compensation"));
  });

  it("inserts opening-style content after first paragraph", () => {
    const jd = "Senior PM\n\nOwn roadmap and metrics for the growth team.";
    const out = insertJdSuggestionIntoRawJd(jd, "You will partner closely with Sales and Design.", {
      issueType: "missing",
      issueTitle: "Company culture and team context",
    });
    expect(out).toContain("partner closely");
    expect(out.indexOf("partner closely")).toBeGreaterThan(out.indexOf("growth team"));
  });
});
