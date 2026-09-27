import { describe, expect, it } from "vitest";
import { candidates, jobs } from "@/lib/engine/data";
import { applyFilters, cumulative, NO_FILTERS, type PoolRow } from "@/lib/engine/filters";
import { rank } from "@/lib/engine/matching";
import { qualificationFor } from "@/lib/engine/qualifications";
import { passportFor } from "@/lib/engine/scoring";

const today = "2026-09-27";
const passports = candidates.map((c) => passportFor(c, today));
const job = jobs[0];
const tasks = job.requirements.map((r) => r.task_id);
const rows: PoolRow[] = rank(job, passports).map((result) => ({ result, qualification: qualificationFor(result.candidate_id), defended: false }));

describe("employer filters", () => {
  it("keeps everyone with no filters set", () => {
    expect(applyFilters(rows, NO_FILTERS, tasks).kept).toHaveLength(8);
  });

  it("every excluded candidate carries a reason, and the kept ones pass every rule", () => {
    const f = { ...NO_FILTERS, minScore: 30, minAqf: 7 };
    const { kept, excluded } = applyFilters(rows, f, tasks);
    expect(kept.length + excluded.length).toBe(8);
    for (const e of excluded) expect(e.reasons.length).toBeGreaterThan(0);
    for (const k of kept) {
      expect(k.result.score).toBeGreaterThanOrEqual(30);
      expect(k.qualification!.aqf).toBeGreaterThanOrEqual(7);
    }
    expect(kept.map((k) => k.result.candidate_id)).toEqual(["C01", "C03"]);
  });

  it("ignores must-meet skills the role doesn't ask for", () => {
    const junior = jobs[1];
    const jr = rank(junior, passports).map((result) => ({ result, qualification: null, defended: false }));
    const { kept } = applyFilters(jr, { ...NO_FILTERS, mustMeet: ["T7"] }, junior.requirements.map((r) => r.task_id));
    expect(kept).toHaveLength(8);
  });

  it("defended-only and grade filters exclude for the stated reason", () => {
    const { excluded } = applyFilters(rows, { ...NO_FILTERS, defendedOnly: true, minGrade: "High Distinction" }, tasks);
    const c01 = excluded.find((e) => e.id === "C01")!;
    expect(c01.reasons).toContain("no defended work sample");
    expect(c01.reasons.some((r) => r.startsWith("Distinction average"))).toBe(true);
  });

  it("the cumulative curve never rises and starts at the pool size", () => {
    const c = cumulative(rows.map((r) => r.result.score));
    expect(c[0].count).toBe(8);
    for (let i = 1; i < c.length; i++) expect(c[i].count).toBeLessThanOrEqual(c[i - 1].count);
  });
});

describe("work rights", () => {
  it("filters on work rights and says why", async () => {
    const { workRightsFor } = await import("@/lib/engine/workRights");
    const withRights = rows.map((r) => ({ ...r, rights: workRightsFor(r.result.candidate_id) }));
    const none = applyFilters(withRights, { ...NO_FILTERS, workRights: "no_sponsorship" }, tasks);
    expect(none.kept.map((k) => k.result.candidate_id).sort()).toEqual(["C03", "C04", "C05", "C06", "C07"]);
    expect(none.excluded.find((e) => e.id === "C01")!.reasons).toContain("work rights: needs sponsorship");
    const unrestricted = applyFilters(withRights, { ...NO_FILTERS, workRights: "unrestricted" }, tasks);
    expect(unrestricted.kept.map((k) => k.result.candidate_id).sort()).toEqual(["C04", "C05", "C07"]);
  });
});
