"use client";

import type { Instance } from "./engine/generator";
import { lowerBand, type Graded, type RubricBand, type Submission } from "./engine/grader";
import { ruleVerdict, templateQuestions, type VivaVerdict } from "./engine/viva";

async function call<T>(body: object): Promise<T | null> {
  try {
    const res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json()) as { available: boolean; data?: T };
    return json.available && json.data ? json.data : null;
  } catch {
    return null;
  }
}

const describe = (sub: Submission) =>
  `Answers: ${JSON.stringify(sub.answers)}\n\nIssue log:\n${sub.issue_log}\n\nCode:\n${sub.code}\n\nFinding:\n${sub.summary}`;

const isBand = (b: unknown): b is RubricBand => b === "approaches" || b === "meets" || b === "exceeds";

export async function llmGrade(g: Graded, sub: Submission): Promise<{ graded: Graded; usedLlm: boolean }> {
  const [t7, t3] = await Promise.all([
    sub.code.trim()
      ? call<{ band: string; reason: string }>({ kind: "grade", part: "T7", criteria: "Does the code implement the cleaning rules and compute the answers reproducibly?", submission: sub.code })
      : null,
    sub.summary.trim()
      ? call<{ band: string; reason: string }>({
          kind: "grade",
          part: "T3",
          criteria: "Accurate to the cleaned data, states the promo effect and top region, notes a caveat, plain English, 120 words or fewer.",
          submission: sub.summary,
        })
      : null,
  ]);
  const rubric = { ...g.rubric };
  for (const [tid, r] of [["T7", t7], ["T3", t3]] as const) {
    if (!r || !isBand(r.band)) continue;
    rubric[tid] = { ...rubric[tid], llm: r.band, llmReason: r.reason, suggested: lowerBand(rubric[tid].auto, r.band) };
  }
  return { graded: { ...g, rubric }, usedLlm: !!(t7 || t3) };
}

export async function vivaQuestions(inst: Instance, sub: Submission): Promise<{ questions: string[]; source: "llm" | "template" }> {
  const r = await call<{ questions: unknown[] }>({ kind: "questions", submission: describe(sub) });
  const qs = (r?.questions ?? []).filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 3);
  return qs.length >= 2 ? { questions: qs, source: "llm" } : { questions: templateQuestions(inst, sub), source: "template" };
}

export async function vivaVerdict(sub: Submission, questions: string[], answers: string[]): Promise<{ verdict: VivaVerdict; reason: string; source: "llm" | "rules" }> {
  const transcript = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? ""}`).join("\n");
  const r = await call<{ verdict: string; reason: string }>({ kind: "verdict", submission: `Code:\n${sub.code}\n\nFinding:\n${sub.summary}`, transcript });
  if (r && (r.verdict === "consistent" || r.verdict === "unclear" || r.verdict === "inconsistent")) return { verdict: r.verdict, reason: r.reason, source: "llm" };
  return { ...ruleVerdict(answers), source: "rules" };
}
