import Link from "next/link";
import { GapChart } from "@/components/GapChart";
import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Card, Check, Rec } from "@/components/ui/Rec";
import { evaluate } from "@/lib/engine/evaluation";

const STEPS = [
  {
    n: "01",
    title: "Translate",
    body: "A CV, references and transcripts become claims against the official ABS task list for the role. Every claim carries an exact quote from the document, or it's thrown out.",
    href: "/candidates",
    cta: "See a passport",
  },
  {
    n: "02",
    title: "Prove only the gap",
    body: "The employer sets a target level per task. The candidate sits a 45-minute seeded work sample for what's missing, then explains it in a short viva. A person confirms.",
    href: "/work-sample/C01",
    cta: "Try the work sample",
  },
  {
    n: "03",
    title: "Shortlist blind",
    body: "Employers rank on evidence with names, countries and universities hidden. Swap every identity and re-run: nobody moves. Workforce planners see who is one gap away.",
    href: "/employer",
    cta: "Open the shortlist",
  },
];

const PRINCIPLES = [
  ["Quotes, not paraphrase", "The AI only maps text to tasks. A quote that isn't word for word in the document is rejected, and the count is shown."],
  ["Rules you can print", "Evidence tiers, bands, level caps and the match formula are plain rules. No black-box score."],
  ["Blind by default", "Identity is hidden until the employer chooses to move someone forward. The swap test proves it."],
  ["Undefended work doesn't count", "A polished submission the candidate can't explain stays self-claimed and can't clear a bar."],
];

export default function Home() {
  const ev = evaluate("2026-09-27");
  const swapPass = ev.swap.every((s) => s.unchanged === s.total);

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-20">
        <div className="animate-rise">
          <Rec className="text-primary-text">For international talent and the SMEs who hire them</Rec>
          <h1 className="mt-4 text-5xl leading-[1.04] sm:text-6xl">
            Australia isn&apos;t short on talent. It&apos;s short on <em className="text-primary-text">evidence it can read</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-foreground-muted">
            A role title from Mumbai, a degree from Manila, three years described in a format no Australian job ad uses. Talent Bridge turns
            documents into checkable evidence, tests only what&apos;s missing, and gives employers a blind, explainable shortlist.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/employer" size="lg">Open the employer view <Arrow /></ButtonLink>
            <ButtonLink href="/candidates" size="lg" variant="secondary" transitionTypes={["nav-forward"]}>See a candidate passport</ButtonLink>
          </div>
        </div>
        <div className="animate-rise [animation-delay:120ms]">
          <GapChart />
        </div>
      </section>

      <section className="border-y bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Rec className="text-foreground-muted">How it works</Rec>
          <h2 className="mt-2 max-w-3xl text-4xl">The broken part isn&apos;t the resume. It&apos;s the evidence behind it.</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <Card className="flex h-full flex-col p-6">
                  <span className="num text-sm text-accent">{s.n}</span>
                  <h3 className="mt-3 text-2xl">{s.title}</h3>
                  <p className="mt-2 flex-1 text-foreground-muted">{s.body}</p>
                  <Link href={s.href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-text underline decoration-primary-line underline-offset-4 hover:decoration-primary">
                    {s.cta} <Arrow />
                  </Link>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <Rec className="text-foreground-muted">Why an employer can trust it</Rec>
            <h2 className="mt-2 text-4xl">AI reads and maps. It never decides.</h2>
            <ul className="mt-6 space-y-4">
              {PRINCIPLES.map(([t, b]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><Check /></span>
                  <span>
                    <span className="font-medium">{t}.</span> <span className="text-foreground-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6 sm:p-8">
            <Rec className="text-primary-text">Tested like a product, not a slideshow</Rec>
            <p className="mt-1 text-xs text-foreground-muted">Computed from the engine at build time, on the fictional sample data.</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7">
              <Metric value={`${ev.precision.toFixed(2)}`} label={`Extraction precision (${ev.extractor}), against team-labelled data`} />
              <Metric value={`${ev.recall.toFixed(2)}`} label="Extraction recall" />
              <Metric value={swapPass ? "Pass" : "Fail"} label={`Identity swap: ${ev.swap.map((s) => `${s.unchanged}/${s.total}`).join(" and ")} unchanged`} />
              <Metric value={`${ev.stuffingScores[0]}`} label="Match score for a keyword-stuffed CV" />
              <Metric value={`${ev.seeds.distinct}/${ev.seeds.total}`} label="Work-sample seeds with a unique answer key" />
              <Metric value={`${ev.seeds.consistent}/${ev.seeds.total}`} label="Answer keys that survive a CSV round trip" />
            </dl>
            <Link href="/method" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary-text underline decoration-primary-line underline-offset-4 hover:decoration-primary">
              The full method and its limits <Arrow />
            </Link>
          </Card>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs text-foreground-muted">{label}</dt>
      <dd className="num text-3xl font-medium">{value}</dd>
    </div>
  );
}
