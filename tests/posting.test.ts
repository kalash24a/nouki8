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

describe("work rights in the ad", () => {
  it("turns 'no sponsorship' and 'citizens only' into filters, and leaves sponsorship-friendly ads alone", () => {
    expect(parsePosting(SAMPLE_POSTING.text).work_rights).toBe("full_time");
    expect(parsePosting("SQL analyst. We cannot offer visa sponsorship.").work_rights).toBe("no_sponsorship");
    expect(parsePosting("SQL analyst. Open to Australian citizens only, baseline clearance needed.").work_rights).toBe("unrestricted");
    const open = parsePosting("SQL analyst. Visa sponsorship is available for the right person.");
    expect([open.work_rights, open.sponsorship_offered]).toEqual(["any", true]);
  });
});

describe("work rights data", () => {
  it("covers every candidate with a known category and a date", async () => {
    const { candidates } = await import("@/lib/engine/data");
    const { workRightsFor, RIGHTS } = await import("@/lib/engine/workRights");
    for (const c of candidates) {
      const w = workRightsFor(c.id)!;
      expect(RIGHTS[w.category]).toBeDefined();
      expect(w.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
