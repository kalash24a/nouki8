"use client";

import { startTransition, useState } from "react";
import { cn } from "@/lib/cn";
import { CountUp } from "./ui/Motion";
import { Card, Rec } from "./ui/Rec";

const VIEWS = {
  grad: { tab: "At graduation", when: "a few months after graduating", ug: 25, pg: 38 },
  later: { tab: "Three years on", when: "three years later", ug: 8, pg: 6 },
} as const;
const MAX = 38;

export function GapChart() {
  const [view, setView] = useState<keyof typeof VIEWS>("grad");
  const v = VIEWS[view];
  const rows = [
    { label: "Undergraduate", gap: v.ug },
    { label: "Postgraduate coursework", gap: v.pg },
  ];
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Rec className="text-foreground-muted">Full-time employment gap</Rec>
        <div role="tablist" aria-label="When" className="inline-flex rounded-full border bg-surface-sunken p-0.5 text-xs">
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => startTransition(() => setView(k))}
              className={cn("rounded-full px-3 py-1.5 transition-colors", view === k ? "bg-inverse text-on-inverse" : "text-foreground-muted hover:text-foreground")}
            >
              {VIEWS[k].tab}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 flex items-baseline gap-2">
        <CountUp value={v.ug} className="num text-7xl font-medium tracking-tight text-accent" />
        <span className="text-lg text-foreground-muted">percentage points</span>
      </p>
      <p className="mt-1 text-sm text-foreground-muted">
        between domestic and international undergraduates in Australia, {v.when}
      </p>

      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs text-foreground-muted">
              <span>{r.label}</span>
              <span className="num">{r.gap} pts</span>
            </div>
            <div className="mt-1.5 h-3 rounded-xs bg-surface-strong">
              <div
                className="h-full rounded-xs bg-[repeating-linear-gradient(135deg,var(--color-accent-mark)_0_3px,var(--color-accent-soft)_3px_7px)] transition-[width] duration-700 ease-out-soft"
                style={{ width: `${(r.gap / MAX) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm">
        One cohort, first surveyed in 2021 and followed up in 2024. The gap mostly closes, so the capability was there. Separately, the latest short-term
        survey found 74% of domestic undergraduates in full-time work against 52% of international graduates.
      </p>
      <p className="mt-4 border-t pt-4 font-display text-lg italic leading-snug">
        The capability shows up eventually. Australia loses it at the front door, when an employer can&apos;t read the evidence.
      </p>
      <p className="mt-3 text-xs text-foreground-muted">
        Source:{" "}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://www.oecd.org/en/publications/international-students-in-higher-education_005ff28d-en/full-report/post-graduation-opportunities-and-possibilities_42892cac.html"
        >
          OECD, International Students in Higher Education, citing QILT Graduate Outcomes Survey data
        </a>
      </p>
    </Card>
  );
}
