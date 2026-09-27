import { taskShort } from "./data";
import { MAPS_TO } from "./generator";
import { LEVEL_LABEL, type Passport, type RequirementResult } from "./types";

export type Gap = { task_id: string; text: string; action: string };

export function gapsFor(results: RequirementResult[], passport: Passport): Gap[] {
  return results
    .filter((r) => r.status !== "meets")
    .map((r) => {
      const name = taskShort(r.task_id);
      const closable = MAPS_TO.includes(r.task_id);
      const action = closable ? "A 45-minute work sample can close this" : "Ask about it at interview";
      if (r.status === "missing") return { task_id: r.task_id, text: `${name}: no evidence in the documents`, action };
      if (r.status === "unproven") {
        const src = passport.entries[r.task_id].claims[0]?.doc_type ?? "document";
        return { task_id: r.task_id, text: `${name}: ${r.band} evidence only (from ${src === "cv" ? "the CV" : `a ${src}`})`, action };
      }
      return { task_id: r.task_id, text: `${name}: evidenced at ${LEVEL_LABEL[r.level]}, role needs ${LEVEL_LABEL[r.target]}`, action };
    });
}

export function evidenceMix(results: RequirementResult[]) {
  const mix = { Strong: 0, Moderate: 0, Weak: 0, "Claimed only": 0, none: 0 };
  for (const r of results) mix[r.band ?? "none"] += 1;
  return mix;
}
