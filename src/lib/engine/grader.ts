import type { Instance } from "./generator";
import { Level } from "./types";

export const BANDS = ["approaches", "meets", "exceeds"] as const;
export type RubricBand = (typeof BANDS)[number];
export const BAND_TO_LEVEL: Record<RubricBand, Level> = { approaches: Level.FOUNDATION, meets: Level.WORKING, exceeds: Level.PROFICIENT };

export type Answers = { duplicates: string; invalid_values: string; top_region: string; avg_promo: string; avg_no_promo: string };
export type Submission = { answers: Answers; issue_log: string; code: string; summary: string };

const ISSUE_PATTERNS: Record<string, RegExp> = {
  duplicates: /duplicat/,
  "invalid values": /negative|zero|invalid|<= ?0|less than/,
  "region spellings": /spelling|inconsisten|standardi|victoria|variant|n\.s\.w/,
  "future dates": /future|after the extract|after extract|post-?dated|dated after/,
  "outlier noted": /outlier|unusual|extreme|1[0-9]{3}|9[0-9]{2}/,
};
const CODE_PATTERNS: Record<string, RegExp> = {
  "removes duplicates": /drop_duplicates|distinct|duplicated|unique\(/,
  "filters invalid values": /> ?0|>= ?0\.01|basket_value\s*<=?|where .*basket/,
  "handles dates": /to_datetime|date|strptime/,
  "standardises regions": /replace|map\(|case when|region/,
  aggregates: /groupby|group by|mean\(|avg\(|aggregate/,
};

function close(a: string, b: number, tol = 0.01) {
  const x = Number(String(a).trim());
  if (String(a).trim() === "" || Number.isNaN(x)) return false;
  return Math.abs(x - b) <= Math.max(tol * Math.abs(b), 0.05);
}

export function autoMark(inst: Instance, a: Answers): Record<string, boolean> {
  const t = inst.truth;
  return {
    "Q1 duplicates": a.duplicates.trim() === String(t.duplicates),
    "Q2 invalid values": a.invalid_values.trim() === String(t.invalid_values),
    "Q3 top region": a.top_region.trim().toUpperCase() === t.top_region,
    "Q4 promo averages": close(a.avg_promo, t.avg_promo) && close(a.avg_no_promo, t.avg_no_promo),
  };
}

const hits = (text: string, patterns: Record<string, RegExp>) =>
  Object.fromEntries(Object.entries(patterns).map(([k, re]) => [k, re.test((text || "").toLowerCase())]));

export function bandFromRatio(ratio: number): RubricBand {
  if (ratio >= 0.95) return "exceeds";
  if (ratio >= 0.6) return "meets";
  return "approaches";
}

export const lowerBand = (...bands: (RubricBand | null | undefined)[]) =>
  bands.filter((b): b is RubricBand => !!b).reduce((lo, b) => (BANDS.indexOf(b) < BANDS.indexOf(lo) ? b : lo));

export type RubricPart = { auto: RubricBand; detail: Record<string, boolean>; llm?: RubricBand | null; llmReason?: string; suggested: RubricBand };
export type Graded = { marks: Record<string, boolean>; rubric: Record<"T2" | "T3" | "T7", RubricPart> };

export function grade(inst: Instance, sub: Submission): Graded {
  const marks = autoMark(inst, sub.answers);
  const issues = hits(sub.issue_log, ISSUE_PATTERNS);
  const code = hits(sub.code, CODE_PATTERNS);
  const count = (o: Record<string, boolean>) => Object.values(o).filter(Boolean).length;
  const n = (b: boolean) => (b ? 1 : 0);

  const t2 = (n(marks["Q1 duplicates"]) + n(marks["Q2 invalid values"]) + (count(issues) / Object.keys(issues).length) * 2) / 4;
  const t3 = (n(marks["Q3 top region"]) + n(marks["Q4 promo averages"]) * 2) / 3;
  const codeLines = sub.code.split("\n").filter((l) => l.trim()).length;
  const t7 = codeLines >= 4 ? count(code) / Object.keys(code).length : 0;

  const part = (ratio: number, detail: Record<string, boolean>): RubricPart => {
    const auto = bandFromRatio(ratio);
    return { auto, detail, suggested: auto };
  };
  return {
    marks,
    rubric: {
      T2: part(t2, {
        "Q1 duplicates": marks["Q1 duplicates"],
        "Q2 invalid values": marks["Q2 invalid values"],
        ...Object.fromEntries(Object.entries(issues).map(([k, v]) => [`logged: ${k}`, v])),
      }),
      T3: part(t3, { "Q3 top region": marks["Q3 top region"], "Q4 promo averages": marks["Q4 promo averages"] }),
      T7: part(t7, Object.fromEntries(Object.entries(code).map(([k, v]) => [`code: ${k}`, v]))),
    },
  };
}

export function withLlm(g: Graded, llm: Partial<Record<"T3" | "T7", { band: RubricBand | null; reason: string }>>): Graded {
  const rubric = { ...g.rubric };
  for (const tid of ["T3", "T7"] as const) {
    const s = llm[tid];
    if (!s) continue;
    rubric[tid] = { ...rubric[tid], llm: s.band, llmReason: s.reason, suggested: lowerBand(rubric[tid].auto, s.band) };
  }
  return { ...g, rubric };
}
