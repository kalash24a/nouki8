import { taskList } from "./data";
import type { Job, Level, Requirement } from "./types";

export type Seniority = "junior" | "mid" | "senior";
export type RequirementSource = { task_id: string; keywords: string[]; sentence: string; cue: string };
export type ParsedPosting = {
  requirements: Requirement[];
  sources: RequirementSource[];
  seniority: Seniority;
  seniority_cue: string;
  min_aqf: number | null;
  aqf_cue: string;
  years: number | null;
};

const SENIORITY: [Seniority, RegExp][] = [
  ["senior", /\b(senior|lead (data|analyst|business)|principal|head of)\b/i],
  ["junior", /\b(junior|graduate|entry[- ]level|intern(ship)?|trainee)\b/i],
];
const BASE_LEVEL: Record<Seniority, Level> = { junior: 1, mid: 2, senior: 3 };

const NICE = /\b(nice to have|desirable|a plus|bonus|preferred|advantageous|exposure to|familiarity|familiar with|basic)\b/i;
const MUST = /\b(must|essential|required|strong|proven|solid|demonstrated)\b/i;
const HIGHER = /\b(advanced|expert|lead|leading|own|owning|architect|design and build|mentor)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hit = (keyword: string, text: string) => new RegExp("\\b" + escape(keyword), "i").test(text);

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+|•|;/)
    .map((s) => s.replace(/^[\s\-*·]+/, "").trim())
    .filter((s) => s.length > 2);
}

export function parsePosting(text: string, title = ""): ParsedPosting {
  const parts = sentences(text);
  const heading = `${title}\n${parts[0] ?? ""}`;
  const found = SENIORITY.find(([, re]) => re.test(heading));
  const seniority: Seniority = found?.[0] ?? "mid";
  const seniority_cue = found ? heading.match(found[1])![0] : "";
  const base = BASE_LEVEL[seniority];

  const sources: RequirementSource[] = [];
  const requirements: Requirement[] = [];

  for (const task of taskList) {
    const matches = parts
      .map((s) => ({ s, kws: task.keywords.filter((k) => hit(k, s)) }))
      .filter((m) => m.kws.length);
    if (!matches.length) continue;

    const nice = matches.every((m) => NICE.test(m.s));
    const must = matches.some((m) => MUST.test(m.s) && !NICE.test(m.s));
    const higher = matches.some((m) => HIGHER.test(m.s) && !NICE.test(m.s));

    let target = nice ? 1 : Math.min(4, base + (higher ? 1 : 0));
    if (task.kind === "core_competency" && !must) target = Math.min(target, 2);
    const weight = nice ? 0.5 : must ? 1.5 : 1;

    const strength = (m: { s: string; kws: string[] }) =>
      (MUST.test(m.s) && !NICE.test(m.s) ? 1000 : 0) + m.kws.length * 100 + m.kws.reduce((n, k) => n + k.length, 0);
    const best = [...matches].sort((a, b) => strength(b) - strength(a))[0];
    const cue = nice ? (best.s.match(NICE)?.[0] ?? "nice to have") : must ? (best.s.match(MUST)?.[0] ?? "") : higher ? (best.s.match(HIGHER)?.[0] ?? "") : "";
    requirements.push({ task_id: task.id, target: target as Level, weight });
    sources.push({ task_id: task.id, keywords: [...new Set(matches.flatMap((m) => m.kws))], sentence: best.s, cue });
  }

  let min_aqf: number | null = null;
  let aqf_cue = "";
  const degreeSentence = parts.find((s) => /\b(phd|doctorate|master'?s?|bachelor'?s?|degree)\b/i.test(s));
  if (degreeSentence && !NICE.test(degreeSentence)) {
    if (/\b(phd|doctorate)\b/i.test(degreeSentence)) min_aqf = 10;
    else if (/\bmaster/i.test(degreeSentence) && !/\bbachelor|\bor\b/i.test(degreeSentence)) min_aqf = 9;
    else min_aqf = 7;
    aqf_cue = degreeSentence;
  }

  const years = Number(text.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)/i)?.[1] ?? NaN);

  return { requirements, sources, seniority, seniority_cue, min_aqf, aqf_cue, years: Number.isFinite(years) ? years : null };
}

export function postedJob(id: string, title: string, employer: string, text: string, requirements: Requirement[]): Job {
  return { id, title: title.trim() || "Untitled role", employer: employer.trim() || "Your company", description: text, requirements };
}

export const SAMPLE_POSTING = {
  title: "Data Analyst, Customer Insights",
  employer: "Northside Logistics (fictional)",
  text: `We're a Melbourne logistics SME looking for a Data Analyst to join our customer insights team.

What you'll do
• Write SQL and Python scripts to pull and clean delivery data from our warehouse systems.
• Build Power BI dashboards the operations team uses every week.
• Analyse delivery trends and forecast demand for peak season.
• Present findings and recommendations to the executive team.

About you
• Must have strong SQL and Python skills and proven experience validating data quality.
• Comfortable working with stakeholders to turn their questions into analysis.
• Familiarity with data privacy and governance is nice to have.
• Bachelor degree in a quantitative field required. 2+ years of experience.`,
};
