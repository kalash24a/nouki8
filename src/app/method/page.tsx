import type { Metadata } from "next";
import { Card, Rec } from "@/components/ui/Rec";
import { occupation, taskList } from "@/lib/engine/data";
import { evaluate } from "@/lib/engine/evaluation";

export const metadata: Metadata = { title: "How it works" };

const TIERS = [
  ["1", "Performed and verified", "Defended work sample, licence", "4"],
  ["2", "Third-party attested", "Reference letter, graded transcript", "3"],
  ["3", "Documented", "CV duty, project summary, undefended detail", "2"],
  ["4", "Self-claimed", "Bare skills-list line, undefended work sample", "1"],
];

const LIMITS = [
  "Redaction hides names, countries, universities and employers. City names, pronouns and country-specific tools can still leak.",
  "Level cues are keyword rules. Transparent and testable, but crude. They need checking against independent human raters.",
  "Scoring weights are starting assumptions, not calibrated values. A 90-day hiring-outcome loop is how they get calibrated.",
  "Gold labels were written by the team, not independent raters. Treat precision as indicative until someone else labels a sample.",
  "One work-sample template covers Data quality, Analysis and Scripting. Visualisation has no task yet, so it stays a gap by design.",
  "The Australian Skills Classification was decommissioned, so tasks come from OSCA. The National Skills Taxonomy is the upgrade path.",
  "Grade conversion lines up pass marks but not how strictly each system marks. Some systems rarely award marks above 80, so their grades may read lower here than they deserve.",
  "The AQF level is an indicative comparison entered with the transcript, not a formal assessment. Assessing authorities can rate the same overseas degree differently.",
];

export default function MethodPage() {
  const ev = evaluate("2026-09-27");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Rec className="text-primary-text">Method</Rec>
      <h1 className="mt-2 text-5xl">How a passport is scored</h1>
      <p className="mt-4 max-w-3xl text-lg text-foreground-muted">
        The language model reads documents and maps sentences to tasks. Everything after that is plain rules, the same ones printed on this page.
      </p>

      <Section title="1 · Tasks come from the official occupation standard">
        <p>
          <a className="underline underline-offset-2" href={occupation.url}>{occupation.classification} · {occupation.code} {occupation.title}</a>, skill level {occupation.skill_level}.
          Its {taskList.filter((t) => t.kind === "osca_task").length} main tasks, plus {taskList.filter((t) => t.kind !== "osca_task").length} platform-defined core competencies.
        </p>
      </Section>

      <Section title="2 · Every claim has a tier">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-left text-foreground-muted"><th className="rec-sm py-2">Tier</th><th className="rec-sm py-2">Meaning</th><th className="rec-sm py-2">Examples</th><th className="rec-sm py-2 text-right">Value</th></tr></thead>
            <tbody>
              {TIERS.map(([t, m, e, v]) => (
                <tr key={t} className="border-t"><td className="num py-2">{t}</td><td className="py-2 font-medium">{m}</td><td className="py-2 text-foreground-muted">{e}</td><td className="num py-2 text-right">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3 · Strength, band and level">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Strength</strong> = best tier value + 0.5 for each other independent document (up to +1), × recency (within 3 years 1.0, within 5 years 0.9, older 0.85 and flagged as dated).</li>
          <li><strong>Band</strong>: Strong ≥ 3.5 · Moderate ≥ 2.5 · Weak ≥ 1.5 · otherwise Claimed only.</li>
          <li><strong>Level</strong> comes from cues in the quote: “assisted”, “under guidance” → Foundation; “built”, “prepared” → Working; “led”, “designed” → Proficient; “accountable for”, “set the strategy” → Advanced.</li>
          <li><strong>Caps</strong>: Claimed only shows no level, Weak caps at Foundation, Moderate at Working. Proficient or above needs a Tier 1 or 2 source.</li>
        </ul>
      </Section>

      <Section title="4 · Matching">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Each requirement is <strong>meets</strong> (Moderate or Strong evidence at or above target), <strong>below</strong>, <strong>unproven</strong> (Weak or Claimed only) or <strong>missing</strong>.</li>
          <li>Match = weighted sum of min(level ÷ target, 1) × evidence factor (Strong 1.0, Moderate 0.8, Weak 0.4, Claimed 0.1), out of 100. Identity is never an input.</li>
        </ul>
      </Section>

      <Section title="5 · Qualifications in Australian terms">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Level</strong> is shown as an AQF level (7 Bachelor, 8 Honours or Graduate Diploma, 9 Masters, 10 Doctoral), following the approach of the Department of Education&apos;s Country Education Profiles. It is indicative: in Australia the employer decides how to weigh an overseas qualification.</li>
          <li><strong>Grades</strong> use the common Australian cut-offs (HD 85, D 75, C 65, P 50) and the 7-point GPA. A grade from another scale is read against the issuer&apos;s own grading legend, rescaled so its pass mark sits at 50 and its top at 100, and taken at the bottom of its band.</li>
          <li><strong>Blind until forward</strong>: the employer sees only the Australian grades. The original grades and scale appear after they move someone forward, because a grading scale can reveal where someone studied. Grades inform; they are not part of the match score.</li>
        </ul>
      </Section>

      <Section title="6 · Evaluation, recomputed at every build">
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact k="Extraction precision" v={ev.precision.toFixed(2)} note={`${ev.extractor} extractor vs team-labelled gold data`} />
          <Fact k="Extraction recall" v={ev.recall.toFixed(2)} />
          <Fact k="Identity-swap test" v={ev.swap.every((s) => s.unchanged === s.total) ? "Pass" : "Fail"} note={ev.swap.map((s) => `${s.job}: ${s.unchanged}/${s.total} unchanged`).join(" · ")} />
          <Fact k="Keyword-stuffed CV" v={`${ev.stuffingScores.join(" / ")}`} note="match score on each role" />
          <Fact k="Work-sample seeds" v={`${ev.seeds.distinct}/${ev.seeds.total}`} note="unique answer keys" />
          <Fact k="CSV round trip" v={`${ev.seeds.consistent}/${ev.seeds.total}`} note="answer key survives export and re-import" />
        </div>
        <p className="mt-3 text-sm text-foreground-muted">
          The same checks run as a test suite (npm test), alongside a parity suite proving this TypeScript engine gives identical passports and rankings to the original Python engine.
        </p>
      </Section>

      <Section title="Known limits, said before a judge says them">
        <ul className="list-disc space-y-1.5 pl-5">
          {LIMITS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="mt-6 p-6 sm:p-8">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground-muted [&_strong]:text-foreground">{children}</div>
    </Card>
  );
}

function Fact({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="rounded-md border bg-surface-sunken px-4 py-3">
      <p className="text-xs">{k}</p>
      <p className="num text-2xl font-medium text-foreground">{v}</p>
      {note && <p className="text-xs">{note}</p>}
    </div>
  );
}
