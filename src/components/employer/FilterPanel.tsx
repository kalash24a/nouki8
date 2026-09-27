"use client";

import { useState } from "react";
import { taskLabel, taskShort } from "@/lib/engine/data";
import type { Filters } from "@/lib/engine/filters";
import type { AuGrade } from "@/lib/engine/qualifications";
import type { RightsFilter } from "@/lib/engine/workRights";
import { LEVEL_LABEL, type Job, type Requirement } from "@/lib/engine/types";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/chart";
import { Card, Rec } from "../ui/Rec";
import { RequirementsEditor } from "./RequirementsEditor";

export function FilterPanel({ job, filters, onChange, onReset, active, shown, total, excluded, edited, onRequirements, onResetTargets }: {
  job: Job;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  active: number;
  shown: number;
  total: number;
  excluded: { id: string; reasons: string[] }[];
  edited: boolean;
  onRequirements: (next: Requirement[]) => void;
  onResetTargets: () => void;
}) {
  const [targets, setTargets] = useState(false);
  const toggleMust = (t: string) =>
    onChange({ mustMeet: filters.mustMeet.includes(t) ? filters.mustMeet.filter((x) => x !== t) : [...filters.mustMeet, t] });

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Rec className="text-primary-text">Filters</Rec>
          <p className="mt-1 text-sm">
            <span className="num text-2xl font-medium">{shown}</span>
            <span className="text-foreground-muted"> of {total} candidates shown</span>
          </p>
        </div>
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear {active}
          </Button>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <Field label="Minimum match" value={`${filters.minScore}%`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => onChange({ minScore: Number(e.target.value) })}
            aria-label="Minimum match"
            className="w-full accent-[var(--color-primary)]"
          />
        </Field>

        <Field label="Must already meet">
          <div className="flex flex-wrap gap-1.5">
            {job.requirements.map((r) => {
              const on = filters.mustMeet.includes(r.task_id);
              return (
                <button
                  key={r.task_id}
                  type="button"
                  aria-pressed={on}
                  title={`${taskLabel(r.task_id)} · target ${LEVEL_LABEL[r.target]}`}
                  onClick={() => toggleMust(r.task_id)}
                  className={cn(
                    "min-h-8 rounded-full border px-2.5 text-xs transition-colors",
                    on ? "border-primary bg-primary text-on-primary" : "bg-surface text-foreground-muted hover:border-line-strong hover:text-foreground",
                  )}
                >
                  {taskShort(r.task_id)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Gaps allowed">
          <Segmented label="Gaps allowed" value={filters.maxGaps} onChange={(v) => onChange({ maxGaps: v })} options={[
            { value: null, label: "Any" }, { value: 0, label: "None" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" },
          ]} />
        </Field>

        <Field label="Qualification">
          <Segmented label="Qualification" value={filters.minAqf} onChange={(v) => onChange({ minAqf: v })} options={[
            { value: null, label: "Any" }, { value: 0, label: "Transcript" }, { value: 7, label: "AQF 7+" }, { value: 9, label: "AQF 9+" },
          ]} />
        </Field>

        <Field label="Grade average">
          <Segmented<AuGrade | null> label="Grade average" value={filters.minGrade} onChange={(v) => onChange({ minGrade: v })} options={[
            { value: null, label: "Any" }, { value: "Pass", label: "P+" }, { value: "Credit", label: "C+" }, { value: "Distinction", label: "D+" }, { value: "High Distinction", label: "HD" },
          ]} />
        </Field>

        <Field label="Right to work">
          <Segmented<RightsFilter> label="Right to work" value={filters.workRights} onChange={(v) => onChange({ workRights: v })} options={[
            { value: "any", label: "Any" }, { value: "no_sponsorship", label: "No sponsor" }, { value: "full_time", label: "Full-time now" }, { value: "unrestricted", label: "Unrestricted" },
          ]} />
        </Field>

        <div className="space-y-2.5">
          <Toggle checked={filters.defendedOnly} onChange={(v) => onChange({ defendedOnly: v })} label="Defended work sample only" />
          <Toggle checked={filters.trustedOnly} onChange={(v) => onChange({ trustedOnly: v })} label="Mostly strong or moderate evidence" />
        </div>

        <div className="border-t pt-4">
          <button type="button" onClick={() => setTargets((v) => !v)} aria-expanded={targets} className="flex w-full items-center justify-between text-sm font-medium">
            <span>Targets and weights{edited && <span className="ml-2 text-xs font-normal text-primary-text">edited</span>}</span>
            <svg viewBox="0 0 16 16" className={cn("h-4 w-4 transition-transform", targets && "rotate-180")} aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
          {targets && (
            <div className="animate-rise mt-2">
              <p className="text-xs text-foreground-muted">Change what the role needs. Every chart and the match scores update.</p>
              <div className="-mx-1 mt-1 max-h-[30rem] overflow-y-auto px-1 [&_.truncate]:hidden">
                <RequirementsEditor requirements={job.requirements} onChange={onRequirements} compact />
              </div>
              {edited && <Button variant="ghost" size="sm" className="mt-2" onClick={onResetTargets}>Reset targets</Button>}
            </div>
          )}
        </div>

        {excluded.length > 0 && (
          <details className="border-t pt-4 text-sm">
            <summary className="cursor-pointer font-medium">Why {excluded.length} {excluded.length === 1 ? "is" : "are"} filtered out</summary>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground-muted">
              {excluded.map((e) => (
                <li key={e.id}>
                  <span className="num font-medium text-foreground">{e.id}</span> · {e.reasons.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        {value && <span className="num text-foreground-muted">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span aria-hidden="true" className="cursor-pointer" onClick={() => onChange(!checked)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-10 shrink-0 rounded-full border transition-colors", checked ? "border-primary bg-primary" : "bg-surface-strong")}
      >
        <span className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-surface shadow-card transition-[left]", checked ? "left-[1.1rem]" : "left-0.5")} />
      </button>
    </div>
  );
}
