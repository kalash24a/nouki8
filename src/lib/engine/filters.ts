import { GPA_POINTS, type AuGrade, type Qualification } from "./qualifications";
import type { MatchResult } from "./types";
import { passesRights, RIGHTS, type RightsFilter, type WorkRights } from "./workRights";

export type Filters = {
  minScore: number;
  maxGaps: number | null;
  mustMeet: string[];
  minAqf: number | null;
  minGrade: AuGrade | null;
  defendedOnly: boolean;
  trustedOnly: boolean;
  workRights: RightsFilter;
};

export const NO_FILTERS: Filters = { minScore: 0, maxGaps: null, mustMeet: [], minAqf: null, minGrade: null, defendedOnly: false, trustedOnly: false, workRights: "any" };

export type PoolRow = { result: MatchResult; qualification: Qualification | null; defended: boolean; rights?: WorkRights | null };

const TRUSTED = new Set(["Strong", "Moderate"]);

export function trustedShare(r: MatchResult): number {
  return r.total ? r.results.filter((x) => x.band && TRUSTED.has(x.band)).length / r.total : 0;
}

export function reasonsOut(row: PoolRow, f: Filters): string[] {
  const { result: r, qualification: q } = row;
  const out: string[] = [];
  if (r.score < f.minScore) out.push(`match ${Math.round(r.score)}% is under ${f.minScore}%`);
  if (f.maxGaps !== null && r.total - r.met > f.maxGaps) out.push(`${r.total - r.met} gaps, more than ${f.maxGaps}`);
  const missed = f.mustMeet.filter((t) => r.results.some((x) => x.task_id === t && x.status !== "meets"));
  if (missed.length) out.push(`doesn't yet meet ${missed.join(", ")}`);
  if (f.minAqf !== null) {
    if (!q) out.push("no transcript");
    else if (q.aqf < f.minAqf) out.push(`AQF ${q.aqf}, below ${f.minAqf}`);
  }
  if (f.minGrade) {
    if (!q) {
      if (f.minAqf === null) out.push("no transcript");
    } else if (GPA_POINTS[q.average] < GPA_POINTS[f.minGrade]) out.push(`${q.average} average, below ${f.minGrade}`);
  }
  if (f.defendedOnly && !row.defended) out.push("no defended work sample");
  if (f.trustedOnly && trustedShare(r) < 0.5) out.push("mostly weak or claimed evidence");
  if (f.workRights !== "any" && !passesRights(row.rights ?? null, f.workRights)) out.push(row.rights ? `work rights: ${RIGHTS[row.rights.category].short.toLowerCase()}` : "work rights not declared");
  return out;
}

export function applyFilters(rows: PoolRow[], f: Filters, jobTasks: string[]) {
  const scoped = { ...f, mustMeet: f.mustMeet.filter((t) => jobTasks.includes(t)) };
  const kept: PoolRow[] = [];
  const excluded: { id: string; reasons: string[] }[] = [];
  for (const row of rows) {
    const reasons = reasonsOut(row, scoped);
    if (reasons.length) excluded.push({ id: row.result.candidate_id, reasons });
    else kept.push(row);
  }
  return { kept, excluded, filters: scoped };
}

export function activeFilters(f: Filters, jobTasks: string[]): number {
  return [
    f.minScore > 0,
    f.maxGaps !== null,
    f.mustMeet.some((t) => jobTasks.includes(t)),
    f.minAqf !== null,
    f.minGrade !== null,
    f.defendedOnly,
    f.trustedOnly,
    f.workRights !== "any",
  ].filter(Boolean).length;
}

export function cumulative(scores: number[], step = 1): { x: number; count: number }[] {
  const points: { x: number; count: number }[] = [];
  for (let x = 0; x <= 100; x += step) points.push({ x, count: scores.filter((s) => s >= x).length });
  return points;
}
