"use client";

import { useMemo, useState } from "react";
import { taskShort } from "@/lib/engine/data";
import { NO_FILTERS, type Filters } from "@/lib/engine/filters";
import { parsePosting, postedJob, SAMPLE_POSTING } from "@/lib/engine/posting";
import { AQF } from "@/lib/engine/qualifications";
import { LEVEL_LABEL, type Requirement } from "@/lib/engine/types";
import type { PostedJob } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Arrow, Button } from "../ui/Button";
import { Badge, Card, Rec } from "../ui/Rec";
import { RequirementsEditor } from "./RequirementsEditor";

function stamp() {
  const now = new Date();
  return { id: `P${now.getTime().toString(36)}`, created: now.toISOString() };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`\\b(${words.map(escape).join("|")})\\w*`, "gi");
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index));
    out.push(<mark key={m.index} className="rounded-xs bg-primary-soft px-0.5 text-primary-text">{m[0]}</mark>);
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

export function PostJobPanel({ onSave, onClose, countFor, total }: {
  onSave: (job: PostedJob, filters: Filters) => void;
  onClose: () => void;
  countFor: (requirements: Requirement[], filters: Filters) => number;
  total: number;
}) {
  const [title, setTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Requirement[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [useAqf, setUseAqf] = useState(true);
  const [useMust, setUseMust] = useState<boolean | null>(null);

  const parsed = useMemo(() => parsePosting(text, title), [text, title]);
  const requirements = overrides ?? parsed.requirements;
  const must = requirements.filter((r) => r.weight >= 1.5).map((r) => r.task_id);

  const buildFilters = (withMust: boolean): Filters => ({
    ...NO_FILTERS,
    minAqf: useAqf && parsed.min_aqf ? parsed.min_aqf : null,
    mustMeet: withMust ? must : [],
  });
  const mustDefault = must.length > 0 && countFor(requirements, buildFilters(true)) > 0;
  const mustOn = useMust ?? mustDefault;
  const filters = buildFilters(mustOn);
  const passing = requirements.length ? countFor(requirements, filters) : 0;

  const sample = () => {
    setTitle(SAMPLE_POSTING.title);
    setEmployer(SAMPLE_POSTING.employer);
    setText(SAMPLE_POSTING.text);
    setOverrides(null);
    setUseMust(null);
  };

  const save = () => {
    const { id, created } = stamp();
    const job = postedJob(id, title, employer, text, requirements);
    onSave({ ...job, posted: true, created, min_aqf: parsed.min_aqf }, filters);
  };

  const sources = new Map(parsed.sources.map((s) => [s.task_id, s]));
  const input = "w-full rounded-sm border bg-surface px-3 py-2 text-sm placeholder:text-foreground-muted/70";

  return (
    <Card className="animate-rise p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Rec className="text-primary-text">Post a job</Rec>
          <h2 className="mt-1 text-3xl">Paste the job ad, get requirements and filters</h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
            Each skill is matched to an OSCA Data Analyst task by the words in your ad, and every one shows the sentence it came from. Check the result before posting.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium">Job title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analyst" className={input} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium">Employer</span>
              <input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Your company" className={input} />
            </label>
          </div>
          <div className="text-sm">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <label htmlFor="jd-text" className="font-medium">Job description</label>
              <button type="button" onClick={sample} className="text-primary-text underline decoration-primary-line underline-offset-4 hover:decoration-primary">
                Use a sample ad
              </button>
            </div>
            <textarea
              id="jd-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOverrides(null);
              }}
              rows={14}
              placeholder="Paste the full job ad here: duties, skills, qualifications."
              className={cn(input, "resize-y leading-relaxed")}
            />
          </div>
        </div>

        <div className="min-w-0">
          <Rec className="text-foreground-muted">What we read</Rec>
          {!text.trim() ? (
            <p className="mt-3 rounded-md border border-dashed px-4 py-6 text-center text-sm text-foreground-muted">
              Requirements appear here as you type or paste.
            </p>
          ) : !requirements.length ? (
            <p className="mt-3 rounded-md border border-dashed border-accent-line bg-accent-soft px-4 py-4 text-sm text-accent">
              No Data Analyst tasks recognised yet. Mention the work itself: SQL, dashboards, data quality, reporting, stakeholders.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y rounded-md border">
                {requirements.map((r) => {
                  const src = sources.get(r.task_id);
                  return (
                    <li key={r.task_id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{taskShort(r.task_id)}</span>
                        <span className="flex items-center gap-1.5">
                          <Badge tone="brand">{LEVEL_LABEL[r.target]}</Badge>
                          {r.weight !== 1 && <Badge tone={r.weight > 1 ? "brandSolid" : "neutral"}>×{r.weight}</Badge>}
                        </span>
                      </div>
                      {src ? (
                        <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                          “<Highlight text={src.sentence} words={src.keywords} />”
                          {src.cue && <span className="ml-1 text-primary-text">· cue: {src.cue}</span>}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-foreground-muted">Added by you</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-3 grid gap-1 text-xs text-foreground-muted">
                <div><dt className="inline font-medium text-foreground">Seniority: </dt><dd className="inline">{parsed.seniority}{parsed.seniority_cue ? ` (from “${parsed.seniority_cue}”)` : " (no senior or junior cue in the title)"}, which sets the base target level</dd></div>
                {parsed.years !== null && <div><dt className="inline font-medium text-foreground">Experience: </dt><dd className="inline">{parsed.years}+ years mentioned. Shown for reference; evidence decides the level, not years.</dd></div>}
              </dl>
              <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="mt-3 text-sm text-primary-text underline decoration-primary-line underline-offset-4 hover:decoration-primary">
                {editing ? "Done adjusting" : "Adjust requirements"}
              </button>
              {overrides && (
                <button type="button" onClick={() => setOverrides(null)} className="ml-4 text-sm text-foreground-muted underline underline-offset-4">
                  Re-read from the ad
                </button>
              )}
              {editing && (
                <div className="animate-rise mt-2 rounded-md border px-3">
                  <RequirementsEditor requirements={requirements} onChange={(next) => setOverrides(next)} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {requirements.length > 0 && (
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-5">
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1 text-xs font-medium">Filters from the ad</legend>
            {parsed.min_aqf !== null ? (
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={useAqf} onChange={(e) => setUseAqf(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-primary)]" />
                <span>
                  {AQF[parsed.min_aqf]} or higher (AQF {parsed.min_aqf}+)
                  <span className="block text-xs text-foreground-muted">from “{parsed.aqf_cue}”</span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-foreground-muted">No required qualification found in the ad.</p>
            )}
            {must.length > 0 && (
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={mustOn} onChange={(e) => setUseMust(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-primary)]" />
                <span>
                  Must already meet {must.map(taskShort).join(", ")}
                  <span className="block text-xs text-foreground-muted">marked as must-haves in the ad</span>
                </span>
              </label>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm">
              <span className="num text-2xl font-medium">{passing}</span>
              <span className="text-foreground-muted"> of {total} candidates would pass</span>
            </p>
            <Button onClick={save} disabled={!title.trim()}>
              Post and view candidates <Arrow />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
