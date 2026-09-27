"use client";

import { useState, ViewTransition } from "react";
import { occupation, taskList, taskShort } from "@/lib/engine/data";
import { MAPS_TO } from "@/lib/engine/generator";
import { qualificationFor } from "@/lib/engine/qualifications";
import { TIER_NAME } from "@/lib/engine/scoring";
import type { Candidate } from "@/lib/engine/types";
import { usePassports } from "@/lib/usePassports";
import { cn } from "@/lib/cn";
import { Arrow, ButtonLink } from "../ui/Button";
import { BandChip, LevelPips, TierChip } from "../ui/Chips";
import { Meter } from "../ui/Meter";
import { CountUp } from "../ui/Motion";
import { Badge, Card, Check, Rec } from "../ui/Rec";
import { QualificationPanel } from "../employer/QualificationPanel";

const DOC_LABEL: Record<string, string> = { cv: "CV", reference: "Reference letter", transcript: "Transcript", project: "Project summary", work_sample: "Work sample" };

export function PassportView({ candidate }: { candidate: Candidate }) {
  const passport = usePassports().get(candidate.id)!;
  const [open, setOpen] = useState<string | null>(null);
  const entries = Object.values(passport.entries);
  const count = (b: string) => entries.filter((e) => e.band === b).length;
  const docs = new Map(candidate.documents.map((d) => [d.id, d]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ViewTransition name={`avatar-${candidate.id}`} share="morph" default="none">
              <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-2xl text-primary-text">
                {candidate.identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
            </ViewTransition>
            <div>
              <Rec className="text-primary-text">My skills passport</Rec>
              <ViewTransition name={`name-${candidate.id}`} share="text-morph" default="none">
                <h1 className="mt-1 w-fit text-4xl">{candidate.identity.name}</h1>
              </ViewTransition>
              <p className="text-sm text-foreground-muted">
                {occupation.title} · OSCA {occupation.code} · built once, used for every job
              </p>
            </div>
          </div>
          <span className="num text-xs text-foreground-muted">{candidate.id}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {candidate.documents.map((d) => (
            <Badge key={d.id} tone={d.doc_type === "reference" || d.doc_type === "transcript" ? "brand" : "neutral"}>
              {(d.doc_type === "reference" || d.doc_type === "transcript") && <Check />}
              {DOC_LABEL[d.doc_type]}{d.issued_by ? ` · ${d.issued_by.split(",")[0]}` : ""}
            </Badge>
          ))}
        </div>

        <p className="mt-5 rounded-md border bg-surface-sunken px-4 py-3 text-sm text-foreground-muted">
          Every row below is backed by an exact quote from a document. Level never exceeds what the evidence supports: Weak caps at Foundation,
          Moderate at Working, and Proficient or above needs a reference, transcript or defended work sample.
        </p>

        <ul className="mt-6 divide-y">
          {taskList.map((t) => {
            const e = passport.entries[t.id];
            const isOpen = open === t.id;
            return (
              <li key={t.id} className="py-4">
                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_7rem] sm:items-center">
                  <div>
                    <p className="font-medium">{taskShort(t.id)}</p>
                    <div className="mt-1"><BandChip band={e?.band ?? null} /></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-muted">{t.label}</p>
                    {e ? (
                      <p className="mt-1 text-xs text-foreground-muted">
                        {e.claims.length} source{e.claims.length > 1 ? "s" : ""} · level from {e.level_reason}
                        {e.dated && <span className="text-accent"> · dated evidence</span>}
                      </p>
                    ) : (
                      MAPS_TO.includes(t.id) && <p className="mt-1 text-xs text-accent">No evidence yet. A work sample can prove this.</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-1.5 sm:items-end">
                    {e ? <LevelPips level={e.level} /> : <span className="text-xs text-foreground-muted">—</span>}
                    {e && (
                      <button type="button" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} className="text-xs text-primary-text underline decoration-primary-line underline-offset-4 hover:decoration-primary">
                        {isOpen ? "Hide" : "Show"} evidence
                      </button>
                    )}
                  </div>
                </div>
                {e && <Meter className="mt-3" value={e.strength} max={4} tone={e.band === "Strong" || e.band === "Moderate" ? "brand" : e.band === "Weak" ? "ochre" : "muted"} label={`${taskShort(t.id)} evidence strength`} />}
                {isOpen && e && (
                  <div className="animate-rise mt-4 space-y-4 border-l-2 border-primary-line pl-4">
                    {e.cap_applied && <p className="text-xs text-accent">{e.cap_applied}</p>}
                    {e.claims.map((cl, i) => {
                      const d = docs.get(cl.doc_id);
                      return (
                        <figure key={i}>
                          <blockquote className="font-display text-[0.98rem] italic leading-snug">“{cl.quote}”</blockquote>
                          <figcaption className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                            <TierChip tier={cl.tier} />
                            <span>{d ? `${d.title}${d.issued_by ? `, ${d.issued_by}` : ""}` : "Work sample"} · {cl.as_of.slice(0, 7)} · cue {cl.level_cue}</span>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <Rec className="text-foreground-muted">Evidence summary</Rec>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            {(["Strong", "Moderate", "Weak", "Claimed only"] as const).map((b) => (
              <div key={b} className="flex flex-col-reverse">
                <dt className="text-xs text-foreground-muted">{b}</dt>
                <dd className="num text-2xl font-medium"><CountUp value={count(b)} /></dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-foreground-muted">
            Extractor: {passport.extractor === "llm" ? "Claude, quotes checked verbatim" : "keyword rules"} · {passport.rejected_quotes} quote(s) rejected as not found in the document
          </p>
        </Card>
        <Card className="p-5">
          <QualificationPanel q={qualificationFor(candidate.id)} revealed audience="candidate" />
          <p className="mt-3 text-xs text-foreground-muted">Employers see the Australian grades only, until they move you forward.</p>
        </Card>
        <Card className="p-5">
          <Rec className="text-foreground-muted">Evidence tiers</Rec>
          <ul className="mt-3 space-y-2 text-sm">
            {[1, 2, 3, 4].map((tier) => (
              <li key={tier} className={cn("flex items-center justify-between gap-2")}>
                <span>Tier {tier}</span>
                <span className="text-xs text-foreground-muted">{TIER_NAME[tier]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <ButtonLink href={`/work-sample/${candidate.id}`} transitionTypes={["nav-forward"]} className="w-full">
          Close a gap with a work sample <Arrow />
        </ButtonLink>
      </aside>
    </div>
  );
}
