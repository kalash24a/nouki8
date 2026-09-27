import { TEMPLATE_ID, TITLE } from "./generator";
import { BAND_TO_LEVEL, type Graded, type RubricBand, type Submission } from "./grader";
import type { Claim } from "./types";
import type { VivaVerdict } from "./viva";

export const MAX_ATTEMPTS = 3;

export type Attempt = {
  id: string;
  candidate_id: string;
  template_id: string;
  seed: number;
  attempt: number;
  started_at: string;
  submitted_at?: string;
  minutes_taken?: number;
  submission?: Submission;
  graded?: Graded;
  viva?: { questions: string[]; source: "llm" | "template"; answers?: string[]; verdict?: VivaVerdict | null; reason?: string };
  review?: { status: "confirmed"; bands: Partial<Record<string, RubricBand>>; defended: boolean; note: string; confirmed_at: string };
};

export const attemptsFor = (all: Attempt[], cid: string) => all.filter((a) => a.candidate_id === cid && a.template_id === TEMPLATE_ID);

export function countingAttempt(all: Attempt[], cid: string): Attempt | null {
  const reviewed = attemptsFor(all, cid).filter((a) => a.review?.status === "confirmed");
  return reviewed.length ? reviewed.reduce((a, b) => (b.attempt > a.attempt ? b : a)) : null;
}

export function claimsFor(all: Attempt[], cid: string): Claim[] {
  const rec = countingAttempt(all, cid);
  if (!rec?.review) return [];
  const n = attemptsFor(all, cid).length;
  const status = rec.review.defended ? "explained and defended" : "not yet defended";
  return Object.entries(rec.review.bands).map(([tid, band]) => ({
    task_id: tid,
    doc_id: rec.id,
    doc_type: "work_sample",
    quote: `Work sample ${rec.template_id} (${TITLE}), attempt ${rec.attempt} of ${n}, seed ${rec.seed}: rubric '${band}', ${status}.`,
    tier: rec.review!.defended ? 1 : 4,
    as_of: rec.submitted_at!.slice(0, 10),
    level_signal: BAND_TO_LEVEL[band!],
    level_cue: `rubric '${band}'`,
  }));
}

export function newAttempt(cid: string, seed: number, attempt: number): Attempt {
  return {
    id: `WS-${cid}-${TEMPLATE_ID}-${attempt}`,
    candidate_id: cid,
    template_id: TEMPLATE_ID,
    seed,
    attempt,
    started_at: new Date().toISOString(),
  };
}
