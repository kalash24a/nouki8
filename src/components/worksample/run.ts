"use client";

import type { Instance } from "@/lib/engine/generator";
import { grade, type Submission } from "@/lib/engine/grader";
import type { Attempt } from "@/lib/engine/worksample";
import { llmGrade, vivaQuestions } from "@/lib/assist";

export async function assistGradeAndViva(inst: Instance, sub: Submission): Promise<{ graded: NonNullable<Attempt["graded"]>; viva: NonNullable<Attempt["viva"]> }> {
  const base = grade(inst, sub);
  const [{ graded }, { questions, source }] = await Promise.all([llmGrade(base, sub), vivaQuestions(inst, sub)]);
  return { graded, viva: { questions, source } };
}
