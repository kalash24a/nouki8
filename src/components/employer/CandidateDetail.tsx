"use client";

import { useState } from "react";
import { taskLabel, taskShort } from "@/lib/engine/data";
import { evidenceMix, gapsFor } from "@/lib/engine/explain";
import { qualificationFor } from "@/lib/engine/qualifications";
import { redact } from "@/lib/engine/redact";
import type { Candidate, Job, MatchResult, Passport } from "@/lib/engine/types";
import { countingAttempt, attemptsFor } from "@/lib/engine/worksample";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Arrow, Button, ButtonLink } from "../ui/Button";
import { BandChip, LevelPips, StatusChip, TierChip } from "../ui/Chips";
import { Meter } from "../ui/Meter";
import { MatchRing } from "../ui/Motion";
import { Badge, Card, Check, Rec } from "../ui/Rec";
import { QualificationPanel } from "./QualificationPanel";
import { WorkRightsPanel } from "./WorkRightsPanel";
import { workRightsFor } from "@/lib/engine/workRights";

export function CandidateDetail({ candidate, passport, result, job }: { candidate: Candidate; passport: Passport; result: MatchResult; job: Job }) {
  const { attempts, revealed } = useAppState();
  const [open, setOpen] = useState<string | null>(null);
  const isRevealed = revealed.includes(candidate.id);
  const ws = countingAttempt(attempts, candidate.id);
  const gaps = gapsFor(result.results, passport);
  const mix = evidenceMix(result.results);
  const weights = new Map(job.requirements.map((r) => [r.task_id, r.weight]));

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start gap-5">
        <MatchRing value={result.score} />
        <div className="min-w-0 flex-1">
          <Rec className="text-primary-text">Skills passport</Rec>
          <h2 className="mt-1 text-3xl">{isRevealed ? candidate.identity.name : `Candidate ${candidate.id}`}</h2>
          {isRevealed ? (
            <p className="mt-1 text-sm text-foreground-muted">
              <Badge tone="positive" className="mr-2"><Check /> Moved forward</Badge>
              {candidate.identity.country} · {candidate.identity.institution}
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              Personal details hidden · judged on evidence only
            </p>
          )}
          <p className="mt-1 text-sm">
            Match for <strong>{job.title}</strong>, not a score of the person.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section aria-labelledby="why">
          <Rec as="h3" className="text-foreground-muted" >
            <span id="why">Why they match</span>
          </Rec>
          <ul className="mt-3 space-y-1">
            {result.results.map((r) => {
              const entry = passport.entries[r.task_id];
              const isOpen = open === r.task_id;
              return (
                <li key={r.task_id} className="rounded-md">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.task_id)}
                    aria-expanded={isOpen}
                    disabled={!entry}
                    className="group w-full rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-sunken disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium" title={taskLabel(r.task_id)}>{taskShort(r.task_id)}</span>
                      <span className="flex items-center gap-1.5">
                        <BandChip band={r.band} />
                        <StatusChip status={r.status} />
                      </span>
                    </div>
                    <Meter className="mt-2" value={r.points} max={weights.get(r.task_id) ?? 1} tone={r.status === "meets" ? "brand" : r.status === "missing" ? "muted" : "ochre"} label={`${taskShort(r.task_id)} contribution`} />
                    <div className="mt-1.5 flex items-center justify-between">
                      <LevelPips level={r.level} target={r.target} />
                      {entry && <span className="text-xs text-primary-text opacity-0 transition-opacity group-hover:opacity-100">{isOpen ? "Hide" : "Show"} evidence</span>}
                    </div>
                  </button>
                  {isOpen && entry && (
                    <div className="animate-rise mx-2 mb-3 space-y-3 border-l-2 border-primary-line pl-4">
                      {entry.cap_applied && <p className="text-xs text-accent">{entry.cap_applied}</p>}
                      {entry.claims.map((cl, i) => (
                        <figure key={i}>
                          <blockquote className="font-display text-[0.95rem] italic leading-snug">
                            “{isRevealed ? cl.quote : redact(cl.quote, candidate)}”
                          </blockquote>
                          <figcaption className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                            <TierChip tier={cl.tier} />
                            <span>{cl.doc_type.replace("_", " ")} · {cl.as_of.slice(0, 7)}</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-7">
          <section>
            <Rec as="h3" className="text-foreground-muted">How {Math.round(result.score)}% is built</Rec>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Requirements met" value={`${result.met} of ${result.total}`}>
                <Meter value={result.met} max={result.total} />
              </Row>
              <Row label="Strong or moderate evidence" value={`${mix.Strong + mix.Moderate} of ${result.total}`}>
                <Meter value={mix.Strong + mix.Moderate} max={result.total} />
              </Row>
              <Row label="Work sample" value={ws ? (ws.review?.defended ? "Defended" : "Not defended") : "None yet"}>
                <Meter value={ws?.review?.defended ? 1 : 0} max={1} />
              </Row>
            </dl>
            {ws && (
              <p className="mt-3 flex items-center gap-2 rounded-md border border-positive-line bg-positive-soft px-3 py-2 text-xs text-positive">
                <Check className="h-3.5 w-3.5" />
                {ws.review?.defended ? "Explained their own task answers in the follow-up viva" : "Work sample submitted but not defended"} · attempt {ws.attempt} of {attemptsFor(attempts, candidate.id).length}
              </p>
            )}
          </section>

          <section>
            <Rec as="h3" className="text-foreground-muted">Gaps to ask about</Rec>
            {gaps.length ? (
              <ul className="mt-3 space-y-2">
                {gaps.map((g) => (
                  <li key={g.task_id} className="flex gap-2 text-sm">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-accent-mark" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 4.5v4.2M8 10.8v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    <span>
                      <span className="text-accent">{g.text}</span>
                      <span className="block text-xs text-foreground-muted">{g.action}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-positive">Meets every requirement for this role.</p>
            )}
          </section>
        </div>
      </div>

      <div className="mt-8 grid gap-8 border-t pt-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section>
          <QualificationPanel q={qualificationFor(candidate.id)} revealed={isRevealed} />
        </section>
        <section className="xl:border-l xl:pl-8">
          <WorkRightsPanel rights={workRightsFor(candidate.id)} revealed={isRevealed} />
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <ButtonLink variant="secondary" href={`/work-sample/${candidate.id}?job=${job.id}`} transitionTypes={["nav-forward"]}>
          Invite to a work sample <Arrow />
        </ButtonLink>
        {isRevealed ? (
          <span className={cn("rec-sm text-primary-text")}>Identity revealed to this employer</span>
        ) : (
          <Button onClick={() => actions.reveal(candidate.id)}>Move forward and reveal identity</Button>
        )}
      </div>
    </Card>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-3">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="contents">
        {children}
        <span className="num w-24 text-right text-xs">{value}</span>
      </dd>
    </div>
  );
}
