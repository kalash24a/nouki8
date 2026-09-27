import { tasks } from "./data";
import { roundHalfEven } from "./scoring";
import { LEVEL_LABEL, Level, type Band, type Job, type MatchResult, type Passport, type Requirement, type RequirementResult } from "./types";

export const EVIDENCE_FACTOR: Record<Band, number> = { Strong: 1, Moderate: 0.8, Weak: 0.4, "Claimed only": 0.1 };
const TRUSTED: Band[] = ["Strong", "Moderate"];

export function evaluate(req: Requirement, passport: Passport): RequirementResult {
  const entry = passport.entries[req.task_id];
  if (!entry) return { task_id: req.task_id, target: req.target, level: Level.NONE, band: null, status: "missing", points: 0 };
  const status = !TRUSTED.includes(entry.band) ? "unproven" : entry.level >= req.target ? "meets" : "below";
  const ratio = req.target ? Math.min(entry.level / req.target, 1) : 1;
  const points = roundHalfEven(req.weight * ratio * EVIDENCE_FACTOR[entry.band], 3);
  return { task_id: req.task_id, target: req.target, level: entry.level, band: entry.band, status, points };
}

export function explain(results: RequirementResult[], passport: Passport): string {
  const met = results.filter((r) => r.status === "meets");
  const rest = results.filter((r) => r.status !== "meets");
  const parts = [`Meets ${met.length} of ${results.length} requirements.`];
  if (met.length) {
    const best = met.reduce((b, r) => {
      const [rs, bs] = [passport.entries[r.task_id].strength, passport.entries[b.task_id].strength];
      return r.level > b.level || (r.level === b.level && rs > bs) ? r : b;
    });
    const entry = passport.entries[best.task_id];
    parts.push(`Strongest: ${best.task_id} at ${LEVEL_LABEL[best.level]}, ${entry.band} evidence from ${entry.claims[0].doc_type}.`);
  }
  if (rest.length) parts.push("To prove: " + rest.map((r) => `${r.task_id} (${r.status})`).join(", ") + ".");
  return parts.join(" ");
}

export function match(job: Job, passport: Passport): MatchResult {
  const results = job.requirements.map((r) => evaluate(r, passport));
  const totalWeight = job.requirements.reduce((s, r) => s + r.weight, 0) || 1;
  const score = roundHalfEven((100 * results.reduce((s, r) => s + r.points, 0)) / totalWeight, 1);
  return {
    candidate_id: passport.candidate_id,
    score,
    met: results.filter((r) => r.status === "meets").length,
    total: results.length,
    results,
    to_prove: results.filter((r) => r.status !== "meets").map((r) => r.task_id),
    explanation: explain(results, passport),
  };
}

export function rank(job: Job, passports: Passport[]): MatchResult[] {
  return passports
    .map((p) => match(job, p))
    .sort((a, b) => b.score - a.score || b.met - a.met || (a.candidate_id < b.candidate_id ? -1 : 1));
}

export function keywordRequirements(text: string): Requirement[] {
  const low = text.toLowerCase();
  return Object.values(tasks)
    .filter((t) => t.keywords.some((k) => new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(low)))
    .map((t) => ({ task_id: t.id, target: Level.WORKING, weight: 1 }));
}
