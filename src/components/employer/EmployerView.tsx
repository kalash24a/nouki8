"use client";

import { startTransition, useMemo, useState, ViewTransition } from "react";
import { candidates, taskShort } from "@/lib/engine/data";
import { useJobs } from "@/lib/useJobs";
import { rank } from "@/lib/engine/matching";
import { qualificationFor } from "@/lib/engine/qualifications";
import type { Requirement } from "@/lib/engine/types";
import { attemptsFor, countingAttempt } from "@/lib/engine/worksample";
import { useAppState } from "@/lib/store";
import { usePassports } from "@/lib/usePassports";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { CountUp } from "../ui/Motion";
import { Badge, Card, Check, Rec } from "../ui/Rec";
import { CandidateDetail } from "./CandidateDetail";
import { FairnessPanel } from "./FairnessPanel";
import { CapIcon, qualificationLine } from "./QualificationPanel";
import { VisaIcon } from "./WorkRightsPanel";
import { blindLine, workRightsFor } from "@/lib/engine/workRights";
import { EmployerTabs } from "./EmployerDashboard";
import { JobTabs } from "./JobTabs";
import { RequirementsEditor } from "./RequirementsEditor";

const byId = new Map(candidates.map((c) => [c.id, c]));

export function EmployerView({ initialJob, initialCandidate }: { initialJob?: string; initialCandidate?: string }) {
  const passports = usePassports();
  const { attempts } = useAppState();
  const jobs = useJobs();
  const [jobId, setJobId] = useState(initialJob ?? jobs[0].id);
  const [edits, setEdits] = useState<Record<string, Requirement[]>>({});
  const [selected, setSelected] = useState<string | null>(byId.has(initialCandidate ?? "") ? initialCandidate! : null);
  const [onlyStrong, setOnlyStrong] = useState(false);
  const [editing, setEditing] = useState(false);

  const baseJob = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const activeId = baseJob.id;
  const job = useMemo(() => ({ ...baseJob, requirements: edits[activeId] ?? baseJob.requirements }), [baseJob, edits, activeId]);
  const ranked = useMemo(() => rank(job, [...passports.values()]), [job, passports]);
  const shown = onlyStrong ? ranked.filter((m) => m.score >= 60) : ranked;
  const current = ranked.find((m) => m.candidate_id === selected) ?? ranked[0];

  const ready = ranked.filter((m) => m.met === m.total).length;
  const oneGap = ranked.filter((m) => m.total - m.met === 1).length;
  const defended = candidates.filter((c) => countingAttempt(attempts, c.id)?.review?.defended).length;

  const choose = (cid: string) => startTransition(() => setSelected(cid));
  const updateReqs = (next: Requirement[]) => startTransition(() => setEdits((e) => ({ ...e, [activeId]: next })));
  const switchJob = (id: string) => {
    window.history.replaceState(null, "", `?job=${id}`);
    startTransition(() => {
      setJobId(id);
      setSelected(null);
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">Employer</Badge>
            <EmployerTabs active="shortlist" jobId={activeId} />
          </div>
          <h1 className="mt-2 text-4xl sm:text-5xl">{job.title}</h1>
          <p className="mt-1 text-foreground-muted">{job.employer} · Melbourne</p>
          <div className="mt-4">
            <JobTabs jobs={jobs} activeId={activeId} onSelect={switchJob} postHref={`/employer/dashboard?job=${activeId}&post=1`} />
          </div>
        </div>
        <dl className="grid grid-cols-3 items-start gap-6 text-right">
          <Stat label="Meet every requirement" value={ready} />
          <Stat label="One gap away" value={oneGap} />
          <Stat label="Work samples defended" value={defended} />
        </dl>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-labelledby="shortlist-h" className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="shortlist-h" className="text-2xl">Blind shortlist</h2>
              <p className="text-xs text-foreground-muted">Personal details hidden until you move someone forward. Qualifications shown in Australian terms.</p>
            </div>
            <div className="flex rounded-full border bg-surface p-0.5 text-xs">
              <button onClick={() => startTransition(() => setOnlyStrong(false))} aria-pressed={!onlyStrong} className={cn("rounded-full px-2.5 py-1", !onlyStrong && "bg-inverse text-on-inverse")}>All</button>
              <button onClick={() => startTransition(() => setOnlyStrong(true))} aria-pressed={onlyStrong} className={cn("rounded-full px-2.5 py-1", onlyStrong && "bg-inverse text-on-inverse")}>60%+</button>
            </div>
          </div>

          <ol className="mt-4 space-y-2">
            {shown.map((m) => {
              const active = m.candidate_id === current.candidate_id;
              const ws = countingAttempt(attempts, m.candidate_id);
              return (
                <ViewTransition key={m.candidate_id} update="reorder" enter="fade-in" exit="fade-out" default="none">
                  <li>
                    <button
                      onClick={() => choose(m.candidate_id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-md border bg-surface p-3.5 text-left transition-[border-color,box-shadow,background-color] duration-200",
                        active ? "border-primary shadow-lift ring-1 ring-primary" : "hover:border-line-strong hover:shadow-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <span className="num mr-1.5 text-foreground-muted">#{ranked.indexOf(m) + 1}</span>
                            Candidate {m.candidate_id}
                          </p>
                          <p className="mt-1 text-xs text-foreground-muted">
                            <span className="text-positive">Meets {m.met}/{m.total}</span>
                            {m.to_prove.length > 0 && <> · To prove: {m.to_prove.map(taskShort).join(", ")}</>}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
                            <CapIcon />
                            {qualificationLine(qualificationFor(m.candidate_id))}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
                            <VisaIcon />
                            {blindLine(workRightsFor(m.candidate_id))}
                          </p>
                          {ws && (
                            <Badge tone={ws.review?.defended ? "positive" : "ochre"} className="mt-2">
                              <Check /> Work sample {ws.review?.defended ? "defended" : "not defended"} · attempt {ws.attempt}/{attemptsFor(attempts, m.candidate_id).length}
                            </Badge>
                          )}
                        </div>
                        <span className="num text-2xl font-medium">{Math.round(m.score)}%</span>
                      </div>
                    </button>
                  </li>
                </ViewTransition>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-foreground-muted">
            Match = weighted share of requirements met at target level, discounted by evidence strength. Strong 1.0 · Moderate 0.8 · Weak 0.4 · Claimed 0.1.
          </p>
        </section>

        <div className="min-w-0 space-y-6">
          <ViewTransition key={current.candidate_id} enter="fade-in" exit="fade-out" default="none">
            <div>
              <CandidateDetail candidate={byId.get(current.candidate_id)!} passport={passports.get(current.candidate_id)!} result={current} job={job} />
            </div>
          </ViewTransition>

          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Rec className="text-primary-text">Role requirements</Rec>
                <h2 className="mt-1 text-2xl">Set the level you actually need</h2>
                <p className="mt-1 max-w-xl text-sm text-foreground-muted">
                  Tasks come from the ABS occupation standard (OSCA 223231). Change a target and watch the shortlist re-rank.
                </p>
              </div>
              <div className="flex gap-2">
                {edits[activeId] && <Button variant="ghost" size="sm" onClick={() => startTransition(() => setEdits(({ [activeId]: _, ...rest }) => rest))}>Reset</Button>}
                <Button variant="secondary" size="sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
                  {editing ? "Done" : `Edit ${job.requirements.length} requirements`}
                </Button>
              </div>
            </div>
            {editing ? (
              <div className="animate-rise mt-4">
                <RequirementsEditor requirements={job.requirements} onChange={updateReqs} />
              </div>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {job.requirements.map((r) => (
                  <li key={r.task_id}>
                    <Badge tone="neutral" className="text-foreground">
                      {taskShort(r.task_id)} · {["", "Foundation", "Working", "Proficient", "Advanced"][r.target]}
                      {r.weight !== 1 && ` · ×${r.weight}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <FairnessPanel job={job} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse items-end justify-end">
      <dt className="rec-sm mt-1 max-w-24 text-foreground-muted">{label}</dt>
      <dd className="num text-3xl font-medium"><CountUp value={value} /></dd>
    </div>
  );
}
