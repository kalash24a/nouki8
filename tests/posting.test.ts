import { describe, expect, it } from "vitest";
import { parsePosting, SAMPLE_POSTING } from "@/lib/engine/posting";

const byTask = (text: string) => Object.fromEntries(parsePosting(text).requirements.map((r) => [r.task_id, r]));

describe("job description to requirements", () => {
  it("reads the sample posting into requirements, each traced to a sentence", () => {
    const p = parsePosting(SAMPLE_POSTING.text);
    console.log(p.requirements.map((r) => `${r.task_id}:${r.target}×${r.weight}`).join(" "), "| seniority", p.seniority, "| aqf", p.min_aqf, "| years", p.years);
    for (const s of p.sources) expect(SAMPLE_POSTING.text).toContain(s.sentence);
    const r = byTask(SAMPLE_POSTING.text);
    expect(r.T7).toMatchObject({ target: 2, weight: 1.5 });
    expect(r.T4).toBeDefined();
    expect(r.T6).toMatchObject({ target: 1, weight: 0.5 });
    expect(p.min_aqf).toBe(7);
    expect(p.years).toBe(2);
  });

  it("raises targets for senior roles and lowers them for junior ones", () => {
    expect(byTask("Senior analyst. Build dashboards in Tableau.").T4.target).toBe(3);
    expect(byTask("Graduate analyst. Build dashboards in Tableau.").T4.target).toBe(1);
    expect(byTask("Analyst. You will lead the design of our reporting and present findings.").T5.target).toBe(3);
  });

  it("finds nothing in text that mentions no analyst tasks", () => {
    const p = parsePosting("Forklift licence holder wanted for night work.");
    expect(p.requirements).toEqual([]);
    expect(p.min_aqf).toBeNull();
  });

  it("treats a degree marked as preferred as a note, not a filter", () => {
    expect(parsePosting("Python scripting. A master's degree is preferred.").min_aqf).toBeNull();
    expect(parsePosting("Python scripting. Master of Data Science required.").min_aqf).toBe(9);
  });
});

describe("choosing the sentence to show", () => {
  it("cites the most specific sentence, not the first passing mention", () => {
    const p = parsePosting(SAMPLE_POSTING.text);
    const src = Object.fromEntries(p.sources.map((s) => [s.task_id, s.sentence]));
    expect(src.T4).toContain("Power BI dashboards");
    expect(src.C1).toContain("stakeholders");
  });
});
