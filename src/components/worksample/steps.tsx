"use client";

import { useMemo, useState } from "react";
import { jobs, taskLabel, taskShort } from "@/lib/engine/data";
import { VIVA_ANSWERS, sampleSubmission } from "@/lib/engine/demo";
import { BRIEF, EXTRACT_DATE, MAPS_TO, MINUTES, RULES, TITLE, toCsv, type Instance } from "@/lib/engine/generator";
import { BANDS, type Answers, type RubricBand, type Submission } from "@/lib/engine/grader";
import { match } from "@/lib/engine/matching";
import { credential } from "@/lib/engine/portfolio";
import { LEVEL_LABEL, type Candidate, type Job, type Passport } from "@/lib/engine/types";
import type { Attempt } from "@/lib/engine/worksample";
import { cn } from "@/lib/cn";
import { Arrow, Button, ButtonLink } from "../ui/Button";
import { BandChip, LevelPips, StatusChip } from "../ui/Chips";
import { CountUp } from "../ui/Motion";
import { Badge, Card, Check, Rec } from "../ui/Rec";

export function GapsStep({ job, passport, onJob, onStart, attemptsUsed, maxAttempts }: {
  job: Job;
  passport: Passport;
  onJob: (id: string) => void;
  onStart: () => void;
  attemptsUsed: number;
  maxAttempts: number;
}) {
  const m = match(job, passport);
  const covered = m.to_prove.filter((t) => MAPS_TO.includes(t));
  const outside = m.to_prove.filter((t) => !MAPS_TO.includes(t));
  return (
    <Card className="p-5 sm:p-8">
      <Rec className="text-primary-text">Step 1 · what needs proving</Rec>
      <h2 className="mt-1 text-3xl">Test only what&apos;s missing</h2>
      <label className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-foreground-muted">For the role</span>
        <select value={job.id} onChange={(e) => onJob(e.target.value)} className="min-h-10 w-full min-w-0 max-w-full rounded-sm border bg-surface px-3 sm:w-auto">
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title} · {j.employer}</option>
          ))}
        </select>
      </label>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile label="Requirements already met" value={`${m.met} / ${m.total}`} />
        <Tile label="Gaps this task can close" value={String(covered.length)} tone={covered.length ? "brand" : "muted"} />
        <Tile label="Gaps outside its scope" value={String(outside.length)} tone={outside.length ? "ochre" : "muted"} />
      </div>
      <ul className="mt-6 space-y-2">
        {m.results.map((r) => (
          <li key={r.task_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2.5">
            <span className="text-sm">
              <span className="font-medium">{taskShort(r.task_id)}</span>
              <span className="ml-2 text-xs text-foreground-muted">target {LEVEL_LABEL[r.target]}</span>
            </span>
            <span className="flex items-center gap-2">
              {r.status !== "meets" && (MAPS_TO.includes(r.task_id) ? <Badge tone="brand">This task tests it</Badge> : <Badge tone="ochre">Needs a different task</Badge>)}
              <StatusChip status={r.status} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <p className="text-sm text-foreground-muted">
          {MINUTES} minutes · attempts used {attemptsUsed} of {maxAttempts} · the most recent reviewed attempt counts, not the best
        </p>
        <Button onClick={onStart} disabled={attemptsUsed >= maxAttempts || covered.length === 0}>
          {covered.length === 0 ? "Nothing here for this task" : "Start the work sample"} <Arrow />
        </Button>
      </div>
    </Card>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "brand" | "ochre" | "muted" }) {
  return (
    <div className={cn("rounded-md border px-4 py-3", tone === "brand" && "border-primary-line bg-primary-soft", tone === "ochre" && "border-accent-line bg-accent-soft")}>
      <p className="num text-2xl font-medium">{value}</p>
      <p className="rec-sm mt-1 text-foreground-muted">{label}</p>
    </div>
  );
}

const EMPTY_ANSWERS: Answers = { duplicates: "", invalid_values: "", top_region: "", avg_promo: "", avg_no_promo: "" };

export function TaskStep({ inst, onSubmit, busy }: { inst: Instance; onSubmit: (s: Submission) => void; busy: boolean }) {
  const [sub, setSub] = useState<Submission>({ answers: EMPTY_ANSWERS, issue_log: "", code: "", summary: "" });
  const [error, setError] = useState("");
  const csvHref = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(inst.rows))}`, [inst]);
  const setA = (k: keyof Answers, v: string) => setSub((s) => ({ ...s, answers: { ...s.answers, [k]: v } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = Object.values(sub.answers).some((v) => !v.trim()) || !sub.code.trim() || !sub.summary.trim();
    if (missing) {
      setError("Answer all four questions, paste your code and write the finding before submitting.");
      return;
    }
    setError("");
    onSubmit(sub);
  };

  return (
    <Card className="p-5 sm:p-8">
      <Rec className="text-primary-text">Step 2 · the task</Rec>
      <h2 className="mt-1 text-3xl">{TITLE}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <p>{BRIEF[0]}</p>
        <ol className="list-decimal space-y-1 pl-5 text-foreground-muted">
          {BRIEF.slice(1).map((b) => <li key={b}>{b}</li>)}
        </ol>
        <p className="rounded-md border bg-surface-sunken px-3 py-2 text-foreground-muted"><strong className="text-foreground">Cleaning rules.</strong> {RULES}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={csvHref} download={`orders_${inst.seed}.csv`} className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-sm hover:border-primary hover:text-primary-text">
          Download orders.csv
        </a>
        <span className="text-xs text-foreground-muted">
          {inst.rows.length} rows · extract date {EXTRACT_DATE} · seed <span className="num">{inst.seed}</span>, unique to this attempt
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-xs">
          <thead className="bg-surface-sunken text-left">
            <tr>{Object.keys(inst.rows[0]).map((k) => <th key={k} className="num px-3 py-2 font-medium">{k}</th>)}</tr>
          </thead>
          <tbody>
            {inst.rows.slice(0, 6).map((r, i) => (
              <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td key={j} className="num px-3 py-1.5">{String(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-4 rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm">
        <summary className="cursor-pointer text-accent">Presenter tools (demo only)</summary>
        <p className="mt-2 text-xs text-foreground-muted">Pre-fills a strong answer for this seed so the demo runs in seconds. Never shown to real candidates.</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => setSub(sampleSubmission(inst))}>Fill a sample response</Button>
      </details>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Q1 · How many exact duplicate rows?" value={sub.answers.duplicates} onChange={(v) => setA("duplicates", v)} inputMode="numeric" />
          <Field label="Q2 · Rows with a basket value of zero or less (after removing duplicates)?" value={sub.answers.invalid_values} onChange={(v) => setA("invalid_values", v)} inputMode="numeric" />
          <Field label="Q3 · Region with the highest average basket after cleaning (state code)" value={sub.answers.top_region} onChange={(v) => setA("top_region", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Q4 · Average WITH a promo" value={sub.answers.avg_promo} onChange={(v) => setA("avg_promo", v)} inputMode="decimal" />
            <Field label="Average WITHOUT" value={sub.answers.avg_no_promo} onChange={(v) => setA("avg_no_promo", v)} inputMode="decimal" />
          </div>
        </div>
        <Area label="Issue log: what problems did you find, and what did you do?" value={sub.issue_log} onChange={(v) => setSub((s) => ({ ...s, issue_log: v }))} rows={3} />
        <Area label="Code you used" value={sub.code} onChange={(v) => setSub((s) => ({ ...s, code: v }))} rows={7} mono />
        <Area label="Finding for the marketing manager (120 words or fewer)" value={sub.summary} onChange={(v) => setSub((s) => ({ ...s, summary: v }))} rows={4} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Marking and preparing your questions…" : "Submit work"} {!busy && <Arrow />}</Button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (v: string) => void; inputMode?: "numeric" | "decimal" }) {
  return (
    <label className="block text-sm">
      <span className="text-foreground-muted">{label}</span>
      <input name={label.split(" ·")[0].toLowerCase().replace(/\W+/g, "-")} autoComplete="off" spellCheck={false} value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-sm border bg-surface px-3" />
    </label>
  );
}

function Area({ label, value, onChange, rows, mono }: { label: string; value: string; onChange: (v: string) => void; rows: number; mono?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-foreground-muted">{label}</span>
      <textarea name={label.split(":")[0].split(" (")[0].toLowerCase().replace(/\W+/g, "-")} autoComplete="off" value={value} rows={rows} onChange={(e) => onChange(e.target.value)} spellCheck={!mono} className={cn("mt-1.5 w-full rounded-sm border bg-surface px-3 py-2", mono && "num text-xs leading-relaxed")} />
    </label>
  );
}

export function VivaStep({ questions, source, onSubmit, busy }: { questions: string[]; source: string; onSubmit: (a: string[]) => void; busy: boolean }) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.some((a) => !a.trim())) {
      setError("Answer each question, even briefly.");
      return;
    }
    setError("");
    onSubmit(answers);
  };
  return (
    <Card className="p-5 sm:p-8">
      <Rec className="text-primary-text">Step 3 · viva</Rec>
      <h2 className="mt-1 text-3xl">Explain your own work</h2>
      <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
        Three short questions about what you just submitted. Someone who didn&apos;t do the work can&apos;t explain choices they didn&apos;t make. Only
        consistency is checked, not English style. <Badge tone="neutral" className="ml-1">{source === "llm" ? "Questions written by Claude from your submission" : "Template questions"}</Badge>
      </p>
      <details className="mt-4 rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm">
        <summary className="cursor-pointer text-accent">Presenter tools (demo only)</summary>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => setAnswers(questions.map((_, i) => VIVA_ANSWERS[i] ?? VIVA_ANSWERS[0]))}>Fill sample viva answers</Button>
      </details>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        {questions.map((q, i) => (
          <label key={i} className="block text-sm">
            <span className="font-display text-lg italic">“{q}”</span>
            <textarea rows={3} value={answers[i]} onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} className="mt-2 w-full rounded-sm border bg-surface px-3 py-2" />
          </label>
        ))}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Checking consistency…" : "Submit answers"} {!busy && <Arrow />}</Button>
        </div>
      </form>
    </Card>
  );
}

export function ReviewStep({ attempt, onConfirm }: { attempt: Attempt; onConfirm: (bands: Record<string, RubricBand>, defended: boolean, note: string) => void }) {
  const g = attempt.graded!;
  const [bands, setBands] = useState<Record<string, RubricBand>>(Object.fromEntries(Object.entries(g.rubric).map(([t, r]) => [t, r.suggested])));
  const v = attempt.viva!;
  const [defended, setDefended] = useState(v.verdict !== "inconsistent");
  const [note, setNote] = useState("");

  return (
    <Card className="p-5 sm:p-8">
      <Rec className="text-primary-text">Step 4 · reviewer check</Rec>
      <h2 className="mt-1 text-3xl">A person decides</h2>
      <p className="mt-2 text-sm text-foreground-muted">In production this is a separate assessor. The rules and the LLM only suggest.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {Object.entries(g.marks).map(([k, ok]) => (
          <Badge key={k} tone={ok ? "positive" : "red"}>{ok ? <Check /> : "✕"} {k}</Badge>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {Object.entries(g.rubric).map(([tid, r]) => (
          <div key={tid} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">{tid} · {taskShort(tid)}<span className="block text-xs font-normal text-foreground-muted">{taskLabel(tid)}</span></p>
              <div role="radiogroup" aria-label={`Band for ${tid}`} className="flex rounded-sm border bg-surface-sunken p-0.5">
                {BANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    role="radio"
                    aria-checked={bands[tid] === b}
                    onClick={() => setBands((x) => ({ ...x, [tid]: b }))}
                    className={cn("min-h-8 rounded-xs px-3 text-xs capitalize", bands[tid] === b ? "bg-primary text-on-primary" : "text-foreground-muted hover:text-foreground")}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Checks: {Object.entries(r.detail).map(([k, ok]) => `${ok ? "✓" : "✗"} ${k}`).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              Rules suggest <strong>{r.auto}</strong>
              {r.llm && <> · Claude suggests <strong>{r.llm}</strong>{r.llmReason && ` (${r.llmReason})`}</>}
              {" "}· lower of the two pre-selected
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-md border p-4">
        <p className="font-medium">Viva</p>
        <ul className="mt-2 space-y-3">
          {v.questions.map((q, i) => (
            <li key={i} className="text-sm">
              <p className="italic text-foreground-muted">{q}</p>
              <p className="mt-1 border-l-2 border-primary-line pl-3">{v.answers?.[i]}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-foreground-muted">Consistency check: <strong>{v.verdict ?? "unavailable"}</strong> · {v.reason}</p>
        <fieldset className="mt-4 flex flex-wrap gap-4 text-sm">
          <legend className="mb-2 text-foreground-muted">Did the candidate defend the work?</legend>
          <label className="flex items-center gap-2"><input type="radio" name="defended" checked={defended} onChange={() => setDefended(true)} className="accent-[var(--color-primary)]" /> Yes, explained and defended</label>
          <label className="flex items-center gap-2"><input type="radio" name="defended" checked={!defended} onChange={() => setDefended(false)} className="accent-[var(--color-primary)]" /> No, not defended</label>
        </fieldset>
        <label className="mt-3 block text-sm">
          <span className="text-foreground-muted">Reviewer note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-sm border bg-surface px-3" />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => onConfirm(bands, defended, note)}>Confirm review <Arrow /></Button>
      </div>
    </Card>
  );
}

export function ResultStep({ attempt, candidate, job, before, after, attemptsUsed, maxAttempts, onRetry }: {
  attempt: Attempt;
  candidate: Candidate;
  job: Job;
  before: Passport;
  after: Passport;
  attemptsUsed: number;
  maxAttempts: number;
  onRetry: () => void;
}) {
  const mb = match(job, before);
  const ma = match(job, after);
  const bands = attempt.review!.bands;
  const defended = attempt.review!.defended;
  const named = credential(attempt, candidate, true);
  const blind = credential(attempt, candidate, false);

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-8">
        <Rec className="text-primary-text">Step 5 · result</Rec>
        <h2 className="mt-1 text-3xl">{defended ? "Passport upgraded" : "Recorded, but not yet counted"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          {defended
            ? "Defended work counts as Tier 1 evidence: performed and verified."
            : "Undefended work is treated as self-claimed. It shows on the passport but can't lift anyone over an employer's bar until it's defended."}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-positive-line bg-positive-soft px-4 py-3">
            <p className="num text-3xl font-medium"><CountUp value={ma.met} />/{ma.total}</p>
            <p className="rec-sm mt-1 text-positive">Requirements met · was {mb.met}</p>
          </div>
          <div className="rounded-md border px-4 py-3">
            <p className="num text-3xl font-medium"><CountUp value={ma.score} decimals={1} />%</p>
            <p className="rec-sm mt-1 text-foreground-muted">Match for {job.title} · was {mb.score}%</p>
          </div>
          <div className="rounded-md border px-4 py-3">
            <p className="num text-3xl font-medium">{attempt.attempt}/{attemptsUsed}</p>
            <p className="rec-sm mt-1 text-foreground-muted">Attempt shown to employers</p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-foreground-muted">
                <th className="rec-sm py-2 font-medium">Task</th>
                <th className="rec-sm py-2 font-medium">Before</th>
                <th className="rec-sm py-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(bands).map((tid, i) => {
                const b = before.entries[tid];
                const a = after.entries[tid];
                return (
                  <tr key={tid} className="animate-rise border-t" style={{ animationDelay: `${i * 90}ms` }}>
                    <td className="py-3 font-medium">{taskShort(tid)}</td>
                    <td className="py-3">{b ? <span className="flex items-center gap-2"><BandChip band={b.band} /><LevelPips level={b.level} /></span> : <span className="text-foreground-muted">No evidence</span>}</td>
                    <td className="py-3">{a ? <span className="flex items-center gap-2"><BandChip band={a.band} /><LevelPips level={a.level} /></span> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button variant="ghost" onClick={onRetry} disabled={attemptsUsed >= maxAttempts}>
            New attempt ({attemptsUsed} of {maxAttempts} used)
          </Button>
          <ButtonLink href={`/employer?job=${job.id}`}>See the shortlist <Arrow /></ButtonLink>
        </div>
      </Card>

      <div>
        <Rec className="text-foreground-muted">Portfolio piece · one record, two views</Rec>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {[{ cred: named, title: "Candidate's view", file: "" }, { cred: blind, title: "Employer's blind view", file: "-blind" }].map(({ cred, title, file }) => (
            <Card key={title} className="flex flex-col p-5">
              <Rec size="sm" className="text-foreground-muted">{title}</Rec>
              <h3 className="mt-2 text-xl">{cred.name}</h3>
              <p className="text-sm">{cred.credentialSubject.name}</p>
              <p className={cn("mt-2 text-sm font-medium", defended ? "text-positive" : "text-accent")}>
                {defended ? "● Explained and defended" : "● Not yet defended"}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {cred.credentialSubject.result.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-foreground-muted">{taskShort(cred.credentialSubject.achievement.alignment[i].targetCode.split(" ").pop()!)}</span>
                    <span><span className="capitalize">{r.achievedLevel}</span> · {r.value}</span>
                  </li>
                ))}
              </ul>
              <blockquote className="mt-3 line-clamp-4 border-l-2 border-primary-line pl-3 text-sm text-foreground-muted">{cred.evidence[0].narrative}</blockquote>
              <p className="num mt-3 text-xs text-foreground-muted">attempt {attempt.attempt} · seed {attempt.seed} · {attempt.minutes_taken ?? "?"} min · {attempt.submitted_at?.slice(0, 10)}</p>
              <a
                className="mt-4 inline-flex w-fit items-center rounded-sm border border-line-strong px-3 py-1.5 text-xs hover:border-primary hover:text-primary-text"
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(cred, null, 2))}`}
                download={`${attempt.id}${file}.json`}
              >
                Download Open Badges 3.0 JSON
              </a>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-foreground-muted">Shaped as an Open Badges 3.0 OpenBadgeCredential. Unsigned in this prototype; signing with a trusted issuer&apos;s key is on the roadmap.</p>
      </div>
    </div>
  );
}
