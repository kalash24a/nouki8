"use client";

import { startTransition, useMemo, useState, ViewTransition } from "react";
import { taskLabel, taskShort } from "@/lib/engine/data";
import { useJobs } from "@/lib/useJobs";
import { MAPS_TO, TEMPLATE_ID } from "@/lib/engine/generator";
import { rank } from "@/lib/engine/matching";
import { LEVEL_LABEL } from "@/lib/engine/types";
import { usePassports } from "@/lib/usePassports";
import { cn } from "@/lib/cn";
import { ButtonLink, Arrow } from "../ui/Button";
import { StatusChip } from "../ui/Chips";
import { CountUp } from "../ui/Motion";
import { Card, Rec } from "../ui/Rec";

const BANDS = ["Strong", "Moderate", "Weak", "Claimed only"] as const;
const BAND_FILL: Record<(typeof BANDS)[number], string> = {
  Strong: "bg-primary",
  Moderate: "bg-primary-muted",
  Weak: "bg-accent-mark",
  "Claimed only": "bg-line-strong",
};

export function WorkforceView() {
  const passports = usePassports();
  const jobs = useJobs();
  const [jobId, setJobId] = useState(jobs[0].id);
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const ranked = useMemo(() => rank(job, [...passports.values()]), [job, passports]);

  const gaps = new Map(ranked.map((m) => [m.candidate_id, m.results.filter((r) => r.status !== "meets")]));
  const ready = [...gaps].filter(([, g]) => g.length === 0);
  const oneGap = [...gaps].filter(([, g]) => g.length === 1);
  const further = [...gaps].filter(([, g]) => g.length > 1);

  const coverage = job.requirements.map((r) => {
    const meeting = ranked.filter((m) => m.results.find((x) => x.task_id === r.task_id)?.status === "meets").length;
    return { ...r, share: Math.round((100 * meeting) / ranked.length), meeting };
  }).sort((a, b) => b.share - a.share);

  const blockers = new Map<string, number>();
  for (const [, g] of oneGap) blockers.set(g[0].task_id, (blockers.get(g[0].task_id) ?? 0) + 1);
  const top = [...blockers].sort((a, b) => b[1] - a[1])[0];

  const reqIds = new Set(job.requirements.map((r) => r.task_id));
  const bandCounts = Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<(typeof BANDS)[number], number>;
  for (const p of passports.values()) for (const e of Object.values(p.entries)) if (reqIds.has(e.task_id)) bandCounts[e.band] += 1;
  const bandTotal = Object.values(bandCounts).reduce((s, x) => s + x, 0) || 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Rec className="text-primary-text">Workforce planning</Rec>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Where the pool is strong, and where it&apos;s thin</h1>
        <div role="tablist" aria-label="Role" className="inline-flex rounded-sm border bg-surface-sunken p-0.5">
          {jobs.map((j) => (
            <button
              key={j.id}
              role="tab"
              aria-selected={j.id === jobId}
              onClick={() => startTransition(() => setJobId(j.id))}
              className={cn("min-h-9 rounded-xs px-3 text-sm", j.id === jobId ? "bg-surface font-medium shadow-card" : "text-foreground-muted hover:text-foreground")}
            >
              {j.title}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-foreground-muted">Built from the same passports employers see. Every candidate here is fictional.</p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Pool", value: ranked.length, tone: "" },
          { label: "Hire-ready now", value: ready.length, tone: "border-positive-line bg-positive-soft" },
          { label: "One gap away", value: oneGap.length, tone: "border-accent-line bg-accent-soft" },
          { label: "Two or more gaps", value: further.length, tone: "" },
        ].map((s) => (
          <div key={s.label} className={cn("flex flex-col-reverse rounded-lg border bg-surface px-5 py-4 shadow-card", s.tone)}>
            <dt className="rec-sm mt-1 text-foreground-muted">{s.label}</dt>
            <dd className="num text-4xl font-medium"><CountUp value={s.value} /></dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-7">
          <Rec className="text-foreground-muted">Share of the pool meeting each target</Rec>
          <ul className="mt-5 space-y-4">
            {coverage.map((c) => (
              <ViewTransition key={`${jobId}-${c.task_id}`} update="reorder" default="none">
                <li>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span title={taskLabel(c.task_id)}>
                      <span className="font-medium">{taskShort(c.task_id)}</span>
                      <span className="ml-2 text-xs text-foreground-muted">target {LEVEL_LABEL[c.target]}</span>
                    </span>
                    <span className="num text-xs">{c.meeting} of {ranked.length} · {c.share}%</span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-xs bg-surface-strong">
                    <div className="animate-grow h-full rounded-xs bg-primary transition-[width] duration-500" style={{ width: `${Math.max(c.share, 1.5)}%` }} />
                  </div>
                </li>
              </ViewTransition>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-7">
            <Rec className="text-accent">Planning signal</Rec>
            {top ? (
              <>
                <p className="mt-3 font-display text-xl leading-snug">
                  {top[1]} of the {oneGap.length} near-ready candidate{oneGap.length > 1 ? "s are" : " is"} held back only by{" "}
                  <span className="text-accent">{taskShort(top[0])}</span>.
                </p>
                <p className="mt-2 text-sm text-foreground-muted">
                  Closing that one skill, through a work sample or targeted training, would grow the hire-ready pool from {ready.length} to {ready.length + top[1]}.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">No candidates are exactly one requirement away for this role.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-7">
            <Rec className="text-foreground-muted">Evidence quality for this role&apos;s tasks</Rec>
            <div className="mt-4 flex h-4 gap-0.5 overflow-hidden rounded-xs" role="img" aria-label={BANDS.map((b) => `${b} ${bandCounts[b]}`).join(", ")}>
              {BANDS.map((b) => (
                <div key={b} className={cn("animate-grow h-full", BAND_FILL[b])} style={{ width: `${(100 * bandCounts[b]) / bandTotal}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {BANDS.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-xs", BAND_FILL[b])} />
                  {b} <span className="num ml-auto text-foreground-muted">{bandCounts[b]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-foreground-muted">A pool heavy in Weak or Claimed evidence is where work samples add the most value.</p>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-5 sm:p-7">
        <Rec className="text-foreground-muted">One gap away</Rec>
        {oneGap.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-foreground-muted">
                  <th className="rec-sm py-2 font-medium">Candidate</th>
                  <th className="rec-sm py-2 font-medium">Gap</th>
                  <th className="rec-sm py-2 font-medium">Status</th>
                  <th className="rec-sm py-2 font-medium">Next step</th>
                </tr>
              </thead>
              <tbody>
                {oneGap.map(([cid, [g]]) => (
                  <tr key={cid} className="border-t">
                    <td className="num py-3">{cid}</td>
                    <td className="py-3">{taskShort(g.task_id)} <span className="text-xs text-foreground-muted">· target {LEVEL_LABEL[g.target]}</span></td>
                    <td className="py-3"><StatusChip status={g.status} /></td>
                    <td className="py-3">
                      {MAPS_TO.includes(g.task_id) ? (
                        <ButtonLink href={`/work-sample/${cid}?job=${jobId}`} size="sm" variant="secondary" transitionTypes={["nav-forward"]}>
                          Invite to {TEMPLATE_ID} <Arrow />
                        </ButtonLink>
                      ) : (
                        <span className="text-foreground-muted">Short training or a different task</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground-muted">Nobody is exactly one requirement away for this role.</p>
        )}
      </Card>
    </div>
  );
}
