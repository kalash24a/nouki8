import type { Instance } from "./generator";
import type { Submission } from "./grader";

export function templateQuestions(inst: Instance, sub: Submission): string[] {
  return [
    `You reported ${sub.answers.duplicates || "no"} duplicate rows. How did you decide two rows were duplicates rather than two genuine orders that happen to look the same?`,
    `Order ${inst.planted.outlier_order} has a very large basket value. Did you keep it, and how would removing it change your promo comparison?`,
    "Which single line of your code would break first if next month's extract used 'Victoria' in a new spelling, and how would you make it robust?",
  ];
}

export type VivaVerdict = "consistent" | "unclear" | "inconsistent";

export function ruleVerdict(answers: string[]): { verdict: VivaVerdict; reason: string } {
  const answered = answers.filter((a) => a.trim().split(/\s+/).length >= 8).length;
  if (answered === 0) return { verdict: "inconsistent", reason: "No substantive answers given." };
  if (answered < answers.length) return { verdict: "unclear", reason: `${answered} of ${answers.length} questions answered in any depth.` };
  return { verdict: "consistent", reason: "Every question answered in its own words. A reviewer still checks the content." };
}
