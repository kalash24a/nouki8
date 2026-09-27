"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useMemo, useState, ViewTransition } from "react";
import { assistGradeAndViva } from "./run";
import { jobs } from "@/lib/engine/data";
import { generate, TEMPLATE_ID } from "@/lib/engine/generator";
import type { RubricBand, Submission } from "@/lib/engine/grader";
import type { Candidate } from "@/lib/engine/types";
import { attemptsFor, MAX_ATTEMPTS, newAttempt, type Attempt } from "@/lib/engine/worksample";
import { vivaVerdict } from "@/lib/assist";
import { actions, useAppState } from "@/lib/store";
import { basePassport, usePassports } from "@/lib/usePassports";
import { cn } from "@/lib/cn";
import { Arrow } from "../ui/Button";
import { Rec } from "../ui/Rec";
import { GapsStep, ResultStep, ReviewStep, TaskStep, VivaStep } from "./steps";

const STEPS = ["Gaps", "Task", "Viva", "Review", "Result"];
const DEMO_SEED = Number(process.env.NEXT_PUBLIC_DEMO_SEED || 0);

function stepFor(a: Attempt | undefined, hasCounting: boolean): number {
  if (!a) return hasCounting ? 4 : 0;
  if (a.review) return 4;
  if (a.viva?.answers) return 3;
  if (a.submitted_at) return 2;
  return 1;
}

export function WorkSampleFlow({ candidate, initialJob }: { candidate: Candidate; initialJob?: string }) {
  const { attempts } = useAppState();
  const passports = usePassports();
  const router = useRouter();
  const mine = attemptsFor(attempts, candidate.id);
  const latest = mine.reduce<Attempt | undefined>((a, b) => (!a || b.attempt > a.attempt ? b : a), undefined);
  const counting = mine.filter((a) => a.review).sort((a, b) => b.attempt - a.attempt)[0];

  const [jobId, setJobId] = useState(jobs.some((j) => j.id === initialJob) ? initialJob! : jobs[0].id);
  const [step, setStep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const job = jobs.find((j) => j.id === jobId)!;
  const current = step ?? stepFor(latest, !!counting);
  const active = current === 4 ? counting ?? latest : latest;
  const inst = useMemo(() => (active ? generate(active.seed) : null), [active]);

  const go = (next: number, mutate?: () => void) => {
    setStep(current);
    mutate?.();
    startTransition(() => {
      addTransitionType(next > current ? "step-forward" : "step-back");
      setStep(next);
    });
  };

  const start = () => {
    const seed = DEMO_SEED || Math.floor(1000 + Math.random() * 999000);
    go(1, () => actions.upsertAttempt(newAttempt(candidate.id, seed, mine.length + 1)));
  };

  const submit = async (sub: Submission) => {
    if (!active || !inst) return;
    setBusy(true);
    const { graded, viva } = await assistGradeAndViva(inst, sub);
    const minutes = Math.max(1, Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000));
    setBusy(false);
    go(2, () => actions.upsertAttempt({ ...active, submission: sub, graded, submitted_at: new Date().toISOString(), minutes_taken: minutes, viva }));
  };

  const answerViva = async (answers: string[]) => {
    if (!active?.viva || !active.submission) return;
    setBusy(true);
    const v = await vivaVerdict(active.submission, active.viva.questions, answers);
    setBusy(false);
    go(3, () => actions.upsertAttempt({ ...active, viva: { ...active.viva!, answers, verdict: v.verdict, reason: `${v.reason} (${v.source === "llm" ? "Claude" : "rule check"})` } }));
  };

  const confirm = (bands: Record<string, RubricBand>, defended: boolean, note: string) => {
    if (!active) return;
    go(4, () => actions.upsertAttempt({ ...active, review: { status: "confirmed", bands, defended, note, confirmed_at: new Date().toISOString() } }));
  };

  const resultAttempt = counting ?? (active?.review ? active : undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/candidates/${candidate.id}`} transitionTypes={["nav-back"]} className="inline-flex items-center gap-2 rounded-sm text-sm text-foreground-muted hover:text-foreground">
            <Arrow back /> {candidate.identity.name}&apos;s passport
          </Link>
          <h1 className="mt-3 text-4xl">Work sample</h1>
          <p className="num mt-1 text-sm text-foreground-muted">{TEMPLATE_ID} · {candidate.id}</p>
        </div>
        <select
          aria-label="Candidate"
          value={candidate.id}
          onChange={(e) => router.push(`/work-sample/${e.target.value}?job=${jobId}`)}
          className="min-h-10 rounded-sm border bg-surface px-3 text-sm"
        >
          {[...passports.keys()].map((cid) => <option key={cid} value={cid}>{cid}</option>)}
        </select>
      </div>

      <ol className="mt-6 grid grid-cols-5 gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === current ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full transition-colors duration-500", i <= current ? "bg-primary" : "bg-surface-strong")} />
            <Rec size="sm" className={cn("mt-2 block", i === current ? "text-primary-text" : "text-foreground-muted")}>{i + 1} · {s}</Rec>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <ViewTransition
          key={current}
          enter={{ "step-forward": "nav-forward", "step-back": "nav-back", default: "none" }}
          exit={{ "step-forward": "nav-forward", "step-back": "nav-back", default: "none" }}
          default="none"
        >
          <div>
            {current === 0 && (
              <GapsStep job={job} passport={passports.get(candidate.id)!} onJob={setJobId} onStart={start} attemptsUsed={mine.length} maxAttempts={MAX_ATTEMPTS} />
            )}
            {current === 1 && inst && <TaskStep key={active!.id} inst={inst} onSubmit={submit} busy={busy} />}
            {current === 2 && active?.viva && <VivaStep key={active.id} questions={active.viva.questions} source={active.viva.source} onSubmit={answerViva} busy={busy} />}
            {current === 3 && active?.graded && active.viva?.answers && <ReviewStep key={active.id} attempt={active} onConfirm={confirm} />}
            {current === 4 && resultAttempt && (
              <ResultStep
                attempt={resultAttempt}
                candidate={candidate}
                job={job}
                before={basePassport(candidate.id)}
                after={passports.get(candidate.id)!}
                attemptsUsed={mine.length}
                maxAttempts={MAX_ATTEMPTS}
                onRetry={() => go(0)}
              />
            )}
          </div>
        </ViewTransition>
      </div>

      {mine.length > 0 && (
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => go(0, () => actions.resetCandidate(candidate.id))}
            className="text-xs text-foreground-muted underline underline-offset-4 hover:text-foreground"
          >
            Presenter tools: reset {candidate.id}&apos;s work samples
          </button>
        </p>
      )}
    </div>
  );
}
