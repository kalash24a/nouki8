import { describe, expect, it } from "vitest";
import gold from "@/data/gold_labels.json";
import { candidates, jobs } from "@/lib/engine/data";
import { sampleSubmission } from "@/lib/engine/demo";
import { identitySwapTest } from "@/lib/engine/fairness";
import { generate, parseCsv, solve, toCsv } from "@/lib/engine/generator";
import { BANDS, grade } from "@/lib/engine/grader";
import { match } from "@/lib/engine/matching";
import { passportFor } from "@/lib/engine/scoring";
import { claimsFor, newAttempt, type Attempt } from "@/lib/engine/worksample";

const today = "2026-09-27";
const passports = Object.fromEntries(candidates.map((c) => [c.id, passportFor(c, today)]));

describe("1. extraction against gold labels", () => {
  it("reports precision and recall", () => {
    let tp = 0, fp = 0, fn = 0;
    for (const [cid, p] of Object.entries(passports)) {
      const predicted = new Set(Object.values(p.entries).filter((e) => e.claims.some((c) => c.tier <= 3)).map((e) => e.task_id));
      const truth = new Set((gold as Record<string, string[] | string>)[cid] as string[]);
      for (const t of predicted) truth.has(t) ? tp++ : fp++;
      for (const t of truth) if (!predicted.has(t)) fn++;
    }
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    console.log(`precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)} (tp ${tp}, fp ${fp}, fn ${fn})`);
    expect(precision).toBeGreaterThanOrEqual(0.75);
    expect(recall).toBeGreaterThanOrEqual(0.85);
  });
});

describe("2. keyword stuffing", () => {
  it("a skills-list-only CV never rises above Weak and scores zero", () => {
    const bands = new Set(Object.values(passports.C05.entries).map((e) => e.band));
    expect([...bands].every((b) => b === "Weak" || b === "Claimed only")).toBe(true);
    for (const job of jobs) expect(match(job, passports.C05).score).toBe(0);
  });
});

describe("3. identity swap", () => {
  it.each(jobs.map((j) => j.id))("%s: every score and rank unchanged", (jid) => {
    const rows = identitySwapTest(jobs.find((j) => j.id === jid)!, candidates, (c) => passportFor(c, today));
    expect(rows.filter((r) => !r.pass)).toEqual([]);
  });
});

describe("4. work-sample seeds", () => {
  it("40 seeds: answers survive a CSV round trip and differ from each other", () => {
    const answerSets = new Set<string>();
    for (let seed = 1000; seed < 1040; seed++) {
      const inst = generate(seed);
      expect(solve(parseCsv(toCsv(inst.rows)))).toEqual(inst.truth);
      expect(inst.truth.duplicates).toBe(inst.planted.duplicates);
      answerSets.add(JSON.stringify(inst.truth));
    }
    expect(answerSets.size).toBe(40);
  });

  it("the same seed always gives the same dataset", () => {
    expect(toCsv(generate(4821).rows)).toBe(toCsv(generate(4821).rows));
  });
});

describe("5. grader sanity", () => {
  it("strong ≥ wrong numbers ≥ blank, strong never 'approaches', blank always 'approaches'", () => {
    const inst = generate(4821);
    const strong = grade(inst, sampleSubmission(inst)).rubric;
    const wrongSub = sampleSubmission(inst);
    wrongSub.answers = { duplicates: "0", invalid_values: "0", top_region: "XX", avg_promo: "1", avg_no_promo: "1" };
    const wrong = grade(inst, wrongSub).rubric;
    const blank = grade(inst, { answers: { duplicates: "", invalid_values: "", top_region: "", avg_promo: "", avg_no_promo: "" }, issue_log: "", code: "", summary: "" }).rubric;
    const i = (b: string) => BANDS.indexOf(b as (typeof BANDS)[number]);
    for (const t of ["T2", "T3", "T7"] as const) {
      expect(i(strong[t].auto)).toBeGreaterThanOrEqual(i(wrong[t].auto));
      expect(i(wrong[t].auto)).toBeGreaterThanOrEqual(i(blank[t].auto));
      expect(strong[t].auto).not.toBe("approaches");
      expect(blank[t].auto).toBe("approaches");
    }
  });
});

describe("6. end to end", () => {
  const c01 = candidates.find((c) => c.id === "C01")!;
  const job = jobs[0];
  const attempt = (defended: boolean): Attempt[] => [{
    ...newAttempt("C01", 4821, 1),
    submitted_at: "2026-09-27T10:00:00.000Z",
    review: { status: "confirmed", defended, note: "", confirmed_at: "2026-09-27T10:05:00.000Z", bands: { T2: "meets", T3: "exceeds", T7: "meets" } },
  }];

  it("a defended work sample closes the T7 gap", () => {
    const before = match(job, passportFor(c01, today));
    const after = match(job, passportFor(c01, today, claimsFor(attempt(true), "C01")));
    console.log(`C01 ${job.id}: meets ${before.met}/${before.total} -> ${after.met}/${after.total}, score ${before.score} -> ${after.score}`);
    expect(before.to_prove).toContain("T7");
    expect(after.to_prove).not.toContain("T7");
    expect(after.score).toBeGreaterThan(before.score);
  });

  it("the same work, undefended, cannot lift anyone over the bar", () => {
    const p = passportFor(c01, today, claimsFor(attempt(false), "C01"));
    expect(["Weak", "Claimed only"]).toContain(p.entries.T7.band);
    expect(match(job, p).to_prove).toContain("T7");
  });
});

describe("7. LLM claims are checked verbatim", async () => {
  const { validateLlmClaims } = await import("@/lib/engine/extract");
  it("keeps exact quotes, rejects invented ones and unknown task ids", () => {
    const doc = candidates[0].documents[1];
    const r = validateLlmClaims(doc, [
      { task_id: "T3", quote: "She led the analysis of our 2025 festive promotions and presented her findings to the regional leadership group" },
      { task_id: "T1", quote: "She single-handedly rebuilt the entire data warehouse." },
      { task_id: "T99", quote: "She followed our data privacy policy carefully when handling customer loyalty data." },
      { task_id: "T6", quote: "She followed our data privacy policy carefully when handling customer loyalty data." },
    ]);
    expect(r.claims.map((c) => c.task_id)).toEqual(["T3", "T6"]);
    expect(r.rejected).toBe(2);
    expect(r.claims[0].level_signal).toBe(3);
  });
});
