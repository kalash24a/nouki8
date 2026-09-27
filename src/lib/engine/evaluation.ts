import gold from "@/data/gold_labels.json";
import { candidates, jobs } from "./data";
import { identitySwapTest } from "./fairness";
import { generate, parseCsv, solve, toCsv } from "./generator";
import { match } from "./matching";
import { passportFor } from "./scoring";

export function evaluate(today: string) {
  const passports = Object.fromEntries(candidates.map((c) => [c.id, passportFor(c, today)]));
  let tp = 0, fp = 0, fn = 0;
  for (const [cid, p] of Object.entries(passports)) {
    const predicted = new Set(Object.values(p.entries).filter((e) => e.claims.some((c) => c.tier <= 3)).map((e) => e.task_id));
    const truth = new Set(((gold as Record<string, unknown>)[cid] as string[]) ?? []);
    for (const t of predicted) if (truth.has(t)) tp++; else fp++;
    for (const t of truth) if (!predicted.has(t)) fn++;
  }
  const swap = jobs.map((j) => {
    const rows = identitySwapTest(j, candidates, (c) => passportFor(c, today));
    return { job: j.id, unchanged: rows.filter((r) => r.pass).length, total: rows.length };
  });
  let consistent = 0;
  const distinct = new Set<string>();
  for (let s = 1000; s < 1040; s++) {
    const inst = generate(s);
    if (JSON.stringify(solve(parseCsv(toCsv(inst.rows)))) === JSON.stringify(inst.truth)) consistent++;
    distinct.add(JSON.stringify(inst.truth));
  }
  return {
    extractor: Object.values(passports)[0].extractor,
    precision: tp / (tp + fp),
    recall: tp / (tp + fn),
    stuffingScores: jobs.map((j) => match(j, passports.C05).score),
    swap,
    seeds: { consistent, total: 40, distinct: distinct.size },
  };
}
