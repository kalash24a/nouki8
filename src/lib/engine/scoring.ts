import { extractCandidate } from "./extract";
import { LEVEL_LABEL, Level, type Band, type Candidate, type Claim, type Passport, type PassportEntry } from "./types";

export const TIER_VALUE: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1 };
export const TIER_NAME: Record<number, string> = {
  1: "performed and verified",
  2: "third-party attested",
  3: "documented",
  4: "self-claimed",
};
const BAND_CAP: Record<Band, Level> = { Strong: Level.ADVANCED, Moderate: Level.WORKING, Weak: Level.FOUNDATION, "Claimed only": Level.NONE };

export function roundHalfEven(x: number, dp: number): number {
  const f = 10 ** dp;
  const v = x * f;
  const floor = Math.floor(v);
  const diff = v - floor;
  if (Math.abs(diff - 0.5) < 1e-9) return (floor % 2 === 0 ? floor : floor + 1) / f;
  return Math.round(v) / f;
}

const toDays = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

export function recency(newest: string, today: string): [number, boolean] {
  const years = (toDays(today) - toDays(newest)) / 365.25;
  if (years <= 3) return [1, false];
  if (years <= 5) return [0.9, false];
  return [0.85, true];
}

export function bandFor(strength: number): Band {
  if (strength >= 3.5) return "Strong";
  if (strength >= 2.5) return "Moderate";
  if (strength >= 1.5) return "Weak";
  return "Claimed only";
}

function firstBy<T>(items: T[], better: (a: T, b: T) => boolean): T {
  return items.reduce((best, x) => (better(x, best) ? x : best));
}

export function scoreTask(taskId: string, claims: Claim[], today: string): PassportEntry {
  const best = firstBy(claims, (a, b) => a.tier < b.tier || (a.tier === b.tier && a.as_of > b.as_of));
  const otherDocs = new Set(claims.filter((c) => c.tier <= 3 && c.doc_id !== best.doc_id).map((c) => c.doc_id));
  const corroboration = best.tier <= 3 ? Math.min(0.5 * otherDocs.size, 1) : 0;
  const newest = claims.map((c) => c.as_of).reduce((a, b) => (b > a ? b : a));
  const [factor, dated] = recency(newest, today);
  const strength = roundHalfEven((TIER_VALUE[best.tier] + corroboration) * factor, 2);
  const band = bandFor(strength);

  const top = firstBy(claims, (a, b) => a.level_signal > b.level_signal || (a.level_signal === b.level_signal && a.tier < b.tier));
  const raw = top.level_signal;
  const cap = BAND_CAP[band];
  let level = Math.min(raw, cap) as Level;
  let cap_applied = "";
  if (level < raw) cap_applied = `Evidence cue suggests ${LEVEL_LABEL[raw]}, capped at ${LEVEL_LABEL[cap]} because evidence is ${band}`;
  if (level >= Level.PROFICIENT && !claims.some((c) => c.tier <= 2)) {
    level = Level.WORKING;
    cap_applied = "Proficient or above needs a verified or third-party source";
  }
  const level_reason = level > Level.NONE ? `${top.level_cue} in ${top.doc_type.replace("_", " ")}` : "no level: evidence is self-claimed";
  const sorted = [...claims].sort((a, b) => a.tier - b.tier || (a.doc_id < b.doc_id ? -1 : a.doc_id > b.doc_id ? 1 : 0));
  return { task_id: taskId, band, strength, level, level_reason, cap_applied, dated, claims: sorted };
}

export function buildPassport(c: Candidate, claims: Claim[], rejected: number, extractor: string, today: string): Passport {
  const byTask = new Map<string, Claim[]>();
  for (const cl of claims) byTask.set(cl.task_id, [...(byTask.get(cl.task_id) ?? []), cl]);
  const entries: Record<string, PassportEntry> = {};
  for (const tid of [...byTask.keys()].sort()) entries[tid] = scoreTask(tid, byTask.get(tid)!, today);
  return { candidate_id: c.id, entries, rejected_quotes: rejected, extractor };
}

export function passportFor(c: Candidate, today: string, extra: Claim[] = []): Passport {
  const { claims, rejected, extractor } = extractCandidate(c);
  return buildPassport(c, claims.concat(extra), rejected, extractor, today);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
