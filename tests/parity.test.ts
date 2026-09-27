import { describe, expect, it } from "vitest";
import fixture from "./fixtures/python-parity.json";
import { candidates, jobs } from "@/lib/engine/data";
import { extractKeyword } from "@/lib/engine/extract";
import { swappedPool } from "@/lib/engine/fairness";
import { rank } from "@/lib/engine/matching";
import { buildPassport } from "@/lib/engine/scoring";
import type { Candidate } from "@/lib/engine/types";

const today = fixture.today;
const keywordPassport = (c: Candidate) => buildPassport(c, c.documents.flatMap(extractKeyword), 0, "keyword", today);
const passports = candidates.map(keywordPassport);

describe("TypeScript engine matches the Python engine", () => {
  it.each(candidates.map((c) => c.id))("passport %s", (cid) => {
    const p = passports.find((x) => x.candidate_id === cid)!;
    const py = fixture.passports[cid as keyof typeof fixture.passports] as Record<string, { band: string; strength: number; level: number; cap: string; dated: boolean; reason: string; claims: unknown[][] }>;
    expect(Object.keys(p.entries)).toEqual(Object.keys(py));
    for (const [tid, e] of Object.entries(p.entries)) {
      const want = py[tid];
      expect({ tid, band: e.band, strength: e.strength, level: e.level, cap: e.cap_applied, dated: e.dated, reason: e.level_reason }).toEqual({
        tid, band: want.band, strength: want.strength, level: want.level, cap: want.cap, dated: want.dated, reason: want.reason,
      });
      expect(e.claims.map((c) => [c.task_id, c.doc_id, c.quote, c.tier, c.level_signal, c.level_cue])).toEqual(want.claims);
    }
  });

  it.each(jobs.map((j) => j.id))("ranking for %s", (jid) => {
    const job = jobs.find((j) => j.id === jid)!;
    const got = rank(job, passports).map((m) => ({ cid: m.candidate_id, score: m.score, met: m.met, to_prove: m.to_prove, explanation: m.explanation }));
    expect(got).toEqual(fixture.matches[jid as keyof typeof fixture.matches]);
  });

  it("identity swap rewrites documents the same way", () => {
    const swapped = swappedPool(candidates);
    for (const c of swapped) expect(c.documents.map((d) => d.text)).toEqual(fixture.swap.J01[c.id as keyof typeof fixture.swap.J01]);
  });
});
