"use client";

import Link from "next/link";
import { startTransition, useMemo, useState, ViewTransition } from "react";
import { candidates, taskLabel, taskShort } from "@/lib/engine/data";
import { activeFilters, applyFilters, NO_FILTERS, type Filters, type PoolRow } from "@/lib/engine/filters";
import { rank } from "@/lib/engine/matching";
import { AU_CUTOFFS, AU_SHORT, qualificationFor } from "@/lib/engine/qualifications";
import { LEVEL_LABEL, type Band, type Job, type MatchResult, type Requirement, type Status } from "@/lib/engine/types";
import { countingAttempt } from "@/lib/engine/worksample";
import { actions, useAppState, type PostedJob } from "@/lib/store";
import { isPosted, useJobs } from "@/lib/useJobs";
import { usePassports } from "@/lib/usePassports";
import { cn } from "@/lib/cn";
import { Arrow, Button, ButtonLink } from "../ui/Button";
import { ChartHead, useTweened } from "../ui/chart";
import { CountUp, MatchRing } from "../ui/Motion";
import { Badge, Card, Rec } from "../ui/Rec";
import { FilterPanel } from "./FilterPanel";
import { JobTabs } from "./JobTabs";
import { CumulativeCurve, PoolRadar, RangeBullets } from "./PoolCharts";
import { PostJobPanel } from "./PostJobPanel";
import { CapIcon, GradeChip, qualificationLine } from "./QualificationPanel";

const SERIES = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4", "bg-series-5", "bg-series-6", "bg-series-7"];

const STATUS_CELL: Record<Status, string> = {
  meets: "border-positive-line bg-positive-soft text-positive",
  below: "border-accent-line bg-accent-soft text-accent",
  unproven: "border-dashed border-accent-line bg-surface text-accent",
  missing: "border-transparent bg-surface-sunken text-foreground-muted",
};
const STATUS_BAR: Record<Status, string> = {
  meets: "bg-positive",
  below: "bg-accent-mark",
  unproven: "hatch",
  missing: "bg-surface-strong",
};
const STATUS_LABEL: Record<Status, string> = { meets: "Meets target", below: "Below target", unproven: "Unproven", missing: "No evidence" };
const STATUSES: Status[] = ["meets", "below", "unproven", "missing"];

type EvidenceKey = Band | "None";
const EVIDENCE: { key: EvidenceKey; label: string; stroke: string; fill: string }[] = [
  { key: "Strong", label: "Strong", stroke: "stroke-primary", fill: "bg-primary" },
  { key: "Moderate", label: "Moderate", stroke: "stroke-primary-muted", fill: "bg-primary-muted" },
  { key: "Weak", label: "Weak", stroke: "stroke-accent-mark", fill: "bg-accent-mark" },
  { key: "Claimed only", label: "Claimed only", stroke: "stroke-line-strong", fill: "bg-line-strong" },
  { key: "None", label: "No evidence", stroke: "stroke-surface-strong", fill: "bg-surface-strong" },
];

export function EmployerTabs({ active, jobId }: { active: "shortlist" | "dashboard"; jobId: string }) {
  const tabs = [
    { id: "shortlist", label: "Shortlist", href: `/employer?job=${jobId}`, types: ["nav-back"] },
    { id: "dashboard", label: "Dashboard", href: `/employer/dashboard?job=${jobId}`, types: ["nav-forward"] },
  ] as const;
  return (
    <nav aria-label="Employer views" className="inline-flex rounded-full border bg-surface p-0.5 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          transitionTypes={[...t.types]}
          aria-current={active === t.id ? "page" : undefined}
          className={cn("rounded-full px-3.5 py-1.5 transition-colors", active === t.id ? "bg-inverse text-on-inverse" : "text-foreground-muted hover:text-foreground")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmployerDashboard({ initialJob, initialPost = false }: { initialJob?: string; initialPost?: boolean }) {
  const passports = usePassports();
  const { attempts } = useAppState();
  const jobs = useJobs();
  const [jobId, setJobId] = useState(initialJob ?? jobs[0].id);
  const [edits, setEdits] = useState<Record<string, Requirement[]>>({});
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [focus, setFocus] = useState<string | null>(null);
  const [posting, setPosting] = useState(initialPost);

  const baseJob = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const activeId = baseJob.id;
  const job = useMemo(() => ({ ...baseJob, requirements: edits[activeId] ?? baseJob.requirements }), [baseJob, edits, activeId]);
  const tasks = job.requirements.map((r) => r.task_id);

  const defended = useMemo(() => new Set(candidates.filter((c) => countingAttempt(attempts, c.id)?.review?.defended).map((c) => c.id)), [attempts]);
  const toRows = (results: MatchResult[]): PoolRow[] =>
    results.map((result) => ({ result, qualification: qualificationFor(result.candidate_id), defended: defended.has(result.candidate_id) }));

  const all = useMemo(() => rank(job, [...passports.values()]), [job, passports]);
  const rows = toRows(all);
  const { kept, excluded } = applyFilters(rows, filters, tasks);
  const eligible = applyFilters(rows, { ...filters, minScore: 0 }, tasks).kept.map((r) => r.result);
  const ranked = kept.map((r) => r.result);
  const keptIds = new Set(ranked.map((m) => m.candidate_id));
  const current = ranked.find((m) => m.candidate_id === focus) ?? ranked[0];
  const activeCount = activeFilters(filters, tasks);

  const pool = all.length;
  const shown = ranked.length;
  const ready = ranked.filter((m) => m.met === m.total).length;
  const oneGap = ranked.filter((m) => m.total - m.met === 1).length;
  const scores = ranked.map((m) => m.score).sort((a, b) => a - b);
  const median = !shown ? 0 : shown % 2 ? scores[(shown - 1) / 2] : (scores[shown / 2 - 1] + scores[shown / 2]) / 2;
  const defendedShown = ranked.filter((m) => defended.has(m.candidate_id)).length;

  const switchJob = (id: string) => {
    window.history.replaceState(null, "", `?job=${id}`);
    startTransition(() => {
      setJobId(id);
      setFocus(null);
    });
  };
  const choose = (cid: string) => startTransition(() => setFocus(cid));
  const patch = (p: Partial<Filters>) => startTransition(() => setFilters((f) => ({ ...f, ...p })));
  const countFor = (requirements: Requirement[], f: Filters) =>
    applyFilters(toRows(rank({ ...job, requirements }, [...passports.values()])), f, requirements.map((r) => r.task_id)).kept.length;

  const onPosted = (posted: PostedJob, f: Filters) => {
    actions.postJob(posted);
    setPosting(false);
    window.history.replaceState(null, "", `?job=${posted.id}`);
    startTransition(() => {
      setJobId(posted.id);
      setFilters(f);
      setFocus(null);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const removePosted = () => {
    actions.removeJob(activeId);
    switchJob(jobs[0].id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="neutral">Employer</Badge>
          <EmployerTabs active="dashboard" jobId={activeId} />
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl">What the pool looks like for this role</h1>
        <p className="mt-1 text-foreground-muted">
          {job.title} · {job.employer} · every candidate still blind
          {isPosted(baseJob) && (
            <button type="button" onClick={removePosted} className="ml-3 text-sm text-foreground-muted underline underline-offset-4 hover:text-destructive">
              Remove this posted job
            </button>
          )}
        </p>
        <div className="mt-4">
          <JobTabs jobs={jobs} activeId={activeId} onSelect={switchJob} onPost={() => setPosting(true)} />
        </div>
      </div>

      {posting && (
        <div className="mt-6">
          <PostJobPanel onSave={onPosted} onClose={() => setPosting(false)} countFor={countFor} total={pool} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:rounded-lg">
          <FilterPanel
            job={job}
            filters={filters}
            onChange={patch}
            onReset={() => startTransition(() => setFilters(NO_FILTERS))}
            active={activeCount}
            shown={shown}
            total={pool}
            excluded={excluded}
            edited={!!edits[activeId]}
            onRequirements={(next) => startTransition(() => setEdits((e) => ({ ...e, [activeId]: next })))}
            onResetTargets={() => startTransition(() => setEdits(({ [activeId]: _, ...rest }) => rest))}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            <Kpi label="Shown after filters" value={shown} of={pool} />
            <Kpi label="Meet every requirement" value={ready} of={shown || 1} tone="positive" />
            <Kpi label="One gap away" value={oneGap} of={shown || 1} tone="ochre" />
            <Kpi label="Median match" value={median} suffix="%" of={100} />
            <Kpi label="Work samples defended" value={defendedShown} of={shown || 1} />
          </dl>

          <Card className="min-w-0 p-5 sm:p-7">
            <ChartHead
              title="Every shown candidate against your targets"
              note={`One view of all ${shown} candidates your filters keep, so you don't need to open them one by one. Levels are what the evidence supports.`}
            />
            {shown ? (
              <div className="mt-4 grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <PoolRadar ranked={ranked} job={job} />
                <RangeBullets ranked={ranked} job={job} />
              </div>
            ) : (
              <Empty excluded={excluded} onClear={() => startTransition(() => setFilters(NO_FILTERS))} />
            )}
          </Card>

          <Card className="min-w-0 p-5 sm:p-7">
            <ChartHead
              title="How many candidates clear each match score"
              note="A cumulative count: read any point as ‘this many candidates score at least this much’. Drag the slider or click the chart to set your minimum."
            />
            <CumulativeCurve pool={all} eligible={eligible} kept={keptIds} minScore={filters.minScore} onMinScore={(v) => patch({ minScore: v })} />
          </Card>

          {current && (
            <>
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="Candidates against your requirements" note="Each cell is the level the evidence supports, coloured by whether it meets your target. Pick a row to compare it with your targets." />
                  <Heatmap ranked={ranked} job={job} current={current.candidate_id} onPick={choose} />
                </Card>

                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="One candidate against your targets" note="Dashed outline is what you asked for, the filled shape is what the evidence shows." />
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-foreground-muted">Candidate</span>
                    <select value={current.candidate_id} onChange={(e) => choose(e.target.value)} className="min-h-9 rounded-sm border bg-surface px-2 text-sm">
                      {ranked.map((m, i) => (
                        <option key={m.candidate_id} value={m.candidate_id}>
                          #{i + 1} Candidate {m.candidate_id} · {Math.round(m.score)}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <Radar result={current} />
                  <FocusSummary result={current} jobId={activeId} />
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="How each match score is built" note="Each segment is one requirement's contribution, weighted and discounted by evidence strength. The empty part is what's still unproven." />
                  <ScoreBuild ranked={ranked} job={job} onPick={choose} current={current.candidate_id} />
                </Card>
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="Coverage of each requirement" note="How many shown candidates meet each target, fall short, or have no trusted evidence yet." />
                  <Coverage ranked={ranked} job={job} />
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="Hiring pipeline" note="From the whole pool to hire-ready now." />
                  <Funnel all={all} ranked={ranked} />
                </Card>
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="Strength of evidence" note="Across every shown candidate and requirement." />
                  <EvidenceDonut ranked={ranked} />
                </Card>
                <Card className="min-w-0 p-5 sm:p-7">
                  <ChartHead title="Qualifications in Australian terms" note="GPA on the 7-point scale, from each transcript. Indicative, not a formal assessment." />
                  <Qualifications ranked={ranked} current={current.candidate_id} onPick={choose} />
                </Card>
              </div>
            </>
          )}

          <p className="text-xs text-foreground-muted">
            Charts follow your filters and targets. Name, country, university and employers stay hidden here, as on the shortlist. All candidates are fictional.
          </p>
        </div>
      </div>
    </div>
  );
}

function Empty({ excluded, onClear }: { excluded: { id: string; reasons: string[] }[]; onClear: () => void }) {
  const counts = new Map<string, number>();
  for (const e of excluded) for (const r of e.reasons) {
    const key = r.replace(/\d+%?/g, "").replace(/\s+/g, " ").split(",")[0].trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="mt-5 rounded-md border border-dashed px-5 py-8 text-center">
      <p className="font-display text-xl">No candidate passes these filters</p>
      {top.length > 0 && (
        <p className="mt-2 text-sm text-foreground-muted">
          Most often: {top.map(([k, n]) => `${k} (${n})`).join(" · ")}
        </p>
      )}
      <Button variant="secondary" size="sm" className="mt-4" onClick={onClear}>Clear filters</Button>
    </div>
  );
}

function Kpi({ label, value, of, suffix = "", tone }: { label: string; value: number; of?: number; suffix?: string; tone?: "positive" | "ochre" }) {
  const share = of ? Math.min(1, value / of) : null;
  return (
    <div className={cn("flex flex-col-reverse justify-end rounded-lg border bg-surface px-4 py-4 shadow-card sm:px-5", tone === "positive" && "border-positive-line bg-positive-soft", tone === "ochre" && "border-accent-line bg-accent-soft")}>
      <dt className="rec-sm mt-1 text-foreground-muted">{label}</dt>
      <dd>
        <span className="num text-4xl font-medium"><CountUp value={value} suffix={suffix} /></span>
        {share !== null && (
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
            <span
              className={cn("animate-grow block h-full rounded-full transition-[width] duration-500", tone === "positive" ? "bg-positive" : tone === "ochre" ? "bg-accent-mark" : "bg-primary")}
              style={{ width: `${share * 100}%` }}
            />
          </span>
        )}
      </dd>
    </div>
  );
}

function Heatmap({ ranked, job, current, onPick }: { ranked: MatchResult[]; job: Job; current: string; onPick: (cid: string) => void }) {
  return (
    <>
      <div className="relative -mx-2 mt-5 overflow-x-auto px-2">
        <table className="w-full min-w-[40rem] border-separate border-spacing-1 text-xs">
          <caption className="sr-only">Evidence level for each candidate and requirement</caption>
          <thead>
            <tr>
              <th scope="col" className="w-20 text-left font-normal text-foreground-muted">Candidate</th>
              {job.requirements.map((r) => (
                <th key={r.task_id} scope="col" className="px-1 pb-1 text-left align-bottom font-normal" title={taskLabel(r.task_id)}>
                  <span className="block font-medium text-foreground">{taskShort(r.task_id)}</span>
                  <span className="text-foreground-muted">target {LEVEL_LABEL[r.target]}</span>
                </th>
              ))}
              <th scope="col" className="w-28 text-right font-normal text-foreground-muted">Match</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((m, i) => {
              const active = m.candidate_id === current;
              return (
                  <tr key={m.candidate_id} className={cn("group", active && "[&_th]:text-primary-text")}>
                    <th scope="row" className="text-left font-normal">
                      <button
                        type="button"
                        onClick={() => onPick(m.candidate_id)}
                        aria-pressed={active}
                        className={cn("w-full whitespace-nowrap rounded-sm px-2 py-2 text-left transition-colors hover:bg-surface-sunken", active && "bg-primary-soft font-medium")}
                      >
                        <span className="num text-foreground-muted">#{i + 1}</span> {m.candidate_id}
                      </button>
                    </th>
                    {m.results.map((r) => (
                      <td key={r.task_id} className="p-0">
                        <span
                          title={`${taskShort(r.task_id)}: ${STATUS_LABEL[r.status]}${r.band ? `, ${r.band} evidence` : ""}`}
                          className={cn("flex h-10 flex-col justify-center rounded-sm border px-2 transition-colors duration-300", STATUS_CELL[r.status], active && "ring-1 ring-primary")}
                        >
                          <span className="font-medium">{r.level ? LEVEL_LABEL[r.level] : "None"}</span>
                          <span className="sr-only">, {STATUS_LABEL[r.status]}</span>
                        </span>
                      </td>
                    ))}
                    <td className="pl-2">
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface-strong sm:block" aria-hidden="true">
                          <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${m.score}%` }} />
                        </span>
                        <span className="num w-10 text-right text-sm font-medium">{Math.round(m.score)}%</span>
                      </span>
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-muted">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("h-3 w-4 rounded-xs border", STATUS_CELL[s])} />
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
    </>
  );
}

function Radar({ result }: { result: MatchResult }) {
  const n = result.results.length;
  const R = 92;
  const tweenLevels = useTweened(result.results.map((r) => r.level));
  const tweenTargets = useTweened(result.results.map((r) => r.target));
  const levels = tweenLevels.length === n ? tweenLevels : result.results.map((r) => r.level);
  const targets = tweenTargets.length === n ? tweenTargets : result.results.map((r) => r.target);
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i: number, level: number) => [Math.cos(angle(i)) * (R * level) / 4, Math.sin(angle(i)) * (R * level) / 4];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
  const summary = result.results.map((r) => `${taskShort(r.task_id)} ${LEVEL_LABEL[r.level] === "—" ? "none" : LEVEL_LABEL[r.level]} against target ${LEVEL_LABEL[r.target]}`).join("; ");

  return (
    <svg viewBox="-178 -122 356 244" className="mx-auto mt-2 w-full max-w-md" role="img" aria-label={`Candidate ${result.candidate_id}: ${summary}`}>
      {[1, 2, 3, 4].map((l) => (
        <polygon key={l} points={poly(Array(n).fill(l))} className="fill-none stroke-line" strokeWidth={l === 4 ? 1.2 : 0.8} />
      ))}
      {result.results.map((r, i) => {
        const [x, y] = pt(i, 4);
        const [lx, ly] = pt(i, 4.9);
        const anchor = Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end";
        return (
          <g key={r.task_id}>
            <line x1={0} y1={0} x2={x} y2={y} className="stroke-line" strokeWidth={0.8} />
            <text x={lx} y={ly + 3} textAnchor={anchor} className="fill-foreground-muted text-[9px]">
              {taskShort(r.task_id)}
            </text>
          </g>
        );
      })}
      <polygon points={poly(targets)} className="fill-none stroke-foreground" strokeWidth={1.4} strokeDasharray="4 3" />
      <polygon points={poly(levels)} className="fill-primary/25 stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      {levels.map((v, i) => {
        const [x, y] = pt(i, v);
        const status = result.results[i].status;
        return <circle key={i} cx={x} cy={y} r={3.2} className={cn(status === "meets" ? "fill-positive" : status === "missing" ? "fill-line-strong" : "fill-accent-mark", "stroke-surface")} strokeWidth={1.2} />;
      })}
      {["F", "W", "P", "A"].map((t, i) => (
        <text key={t} x={3} y={-(R * (i + 1)) / 4 + 3} className="fill-foreground-muted text-[7px]">{t}</text>
      ))}
    </svg>
  );
}

function FocusSummary({ result, jobId }: { result: MatchResult; jobId: string }) {
  const q = qualificationFor(result.candidate_id);
  const short = result.results.filter((r) => r.status !== "meets");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 border-t pt-4">
      <MatchRing value={result.score} size={84} stroke={7} />
      <div className="min-w-[11rem] flex-1 text-sm">
        <p className="font-medium">Candidate {result.candidate_id} · meets {result.met} of {result.total}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-foreground-muted">
          <CapIcon /> {qualificationLine(q)}
        </p>
        <p className="mt-0.5 text-foreground-muted">
          {short.length ? <>To ask about: {short.map((r) => taskShort(r.task_id)).join(", ")}</> : "Meets every requirement."}
        </p>
      </div>
      <ButtonLink href={`/employer?job=${jobId}&candidate=${result.candidate_id}`} variant="secondary" size="sm" transitionTypes={["nav-back"]} className="w-full sm:w-auto">
        Open in shortlist <Arrow />
      </ButtonLink>
    </div>
  );
}

function ScoreBuild({ ranked, job, current, onPick }: { ranked: MatchResult[]; job: Job; current: string; onPick: (cid: string) => void }) {
  const total = job.requirements.reduce((s, r) => s + r.weight, 0) || 1;
  return (
    <>
      <ul className="mt-5 space-y-2.5">
        {ranked.map((m) => (
          <ViewTransition key={m.candidate_id} update="reorder" default="none">
            <li>
              <button type="button" onClick={() => onPick(m.candidate_id)} className="grid w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-sm py-0.5 text-left">
                <span className={cn("num text-xs", m.candidate_id === current ? "font-medium text-primary-text" : "text-foreground-muted")}>{m.candidate_id}</span>
                <span className={cn("animate-grow flex h-5 gap-px overflow-hidden rounded-xs bg-surface-sunken", m.candidate_id === current && "ring-1 ring-primary ring-offset-1 ring-offset-surface")}>
                  {m.results.map((r, i) => (
                    <span
                      key={r.task_id}
                      title={`${taskShort(r.task_id)}: ${((100 * r.points) / total).toFixed(1)} points`}
                      className={cn("h-full transition-[width] duration-500", SERIES[i % SERIES.length])}
                      style={{ width: `${(100 * r.points) / total}%` }}
                    />
                  ))}
                </span>
                <span className="num text-right text-sm font-medium">{Math.round(m.score)}%</span>
              </button>
            </li>
          </ViewTransition>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
        {job.requirements.map((r, i) => (
          <li key={r.task_id} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-xs", SERIES[i % SERIES.length])} />
            {taskShort(r.task_id)}
            {r.weight !== 1 && <span className="num">×{r.weight}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

function Coverage({ ranked, job }: { ranked: MatchResult[]; job: Job }) {
  const rows = job.requirements
    .map((r) => {
      const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
      for (const m of ranked) counts[m.results.find((x) => x.task_id === r.task_id)!.status] += 1;
      return { ...r, counts };
    })
    .sort((a, b) => b.counts.meets - a.counts.meets);
  return (
    <>
      <ul className="mt-5 space-y-3.5">
        {rows.map((r) => (
          <ViewTransition key={r.task_id} update="reorder" default="none">
            <li>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span title={taskLabel(r.task_id)}>
                  <span className="font-medium">{taskShort(r.task_id)}</span>
                  <span className="ml-2 text-xs text-foreground-muted">target {LEVEL_LABEL[r.target]}</span>
                </span>
                <span className="num text-xs">{r.counts.meets} of {ranked.length} meet</span>
              </div>
              <div className="animate-grow mt-1.5 flex h-3 gap-px overflow-hidden rounded-xs" role="img" aria-label={STATUSES.map((s) => `${STATUS_LABEL[s]} ${r.counts[s]}`).join(", ")}>
                {STATUSES.map((s) => (
                  <span key={s} className={cn("h-full transition-[width] duration-500", STATUS_BAR[s])} style={{ width: `${(100 * r.counts[s]) / ranked.length}%` }} />
                ))}
              </div>
            </li>
          </ViewTransition>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-xs", STATUS_BAR[s])} />
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
    </>
  );
}

function Funnel({ all, ranked }: { all: MatchResult[]; ranked: MatchResult[] }) {
  const pool = all.length || 1;
  const stages = [
    { label: "In the pool", value: all.length },
    { label: "Pass your filters", value: ranked.length },
    { label: "Meet half or more", value: ranked.filter((m) => m.met * 2 >= m.total).length },
    { label: "One gap away or ready", value: ranked.filter((m) => m.total - m.met <= 1).length },
    { label: "Hire-ready now", value: ranked.filter((m) => m.met === m.total).length },
  ];
  return (
    <ol className="mt-5 space-y-2">
      {stages.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={cn(i === stages.length - 1 && "font-medium")}>{s.label}</span>
            <span className="num font-medium"><CountUp value={s.value} /></span>
          </div>
          <div className="mt-1 flex h-6 justify-center rounded-xs bg-surface-sunken">
            <span
              className={cn("animate-grow h-full rounded-xs transition-[width] duration-500", i === stages.length - 1 ? "bg-positive" : i === 0 ? "bg-primary-muted" : "bg-primary")}
              style={{ width: `${Math.max((100 * s.value) / pool, 2)}%`, opacity: 1 - i * 0.08, transformOrigin: "center" }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function EvidenceDonut({ ranked }: { ranked: MatchResult[] }) {
  const counts = Object.fromEntries(EVIDENCE.map((e) => [e.key, 0])) as Record<EvidenceKey, number>;
  for (const m of ranked) for (const r of m.results) counts[r.band ?? "None"] += 1;
  const total = Object.values(counts).reduce((s, x) => s + x, 0) || 1;
  const trusted = Math.round((100 * (counts.Strong + counts.Moderate)) / total);
  const shares = useTweened(EVIDENCE.map((e) => counts[e.key] / total));
  const r = 42;
  const c = 2 * Math.PI * r;
  const starts = shares.map((_, i) => shares.slice(0, i).reduce((a, b) => a + b, 0) * c);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={EVIDENCE.map((e) => `${e.label} ${counts[e.key]}`).join(", ")}>
          {EVIDENCE.map((e, i) => (
            <circle key={e.key} cx={50} cy={50} r={r} fill="none" strokeWidth={13} className={e.stroke} strokeDasharray={`${Math.max(shares[i] * c - 0.8, 0)} ${c}`} strokeDashoffset={-starts[i]} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-2xl font-medium"><CountUp value={trusted} suffix="%" /></span>
          <span className="rec-sm text-foreground-muted">trusted</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {EVIDENCE.map((e) => (
          <li key={e.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-xs", e.fill)} />
            {e.label}
            <span className="num ml-auto text-foreground-muted">{counts[e.key]}</span>
          </li>
        ))}
      </ul>
      <p className="w-full text-xs text-foreground-muted">Trusted means Strong or Moderate. The rest is where a work sample adds the most.</p>
    </div>
  );
}

function Qualifications({ ranked, current, onPick }: { ranked: MatchResult[]; current: string; onPick: (cid: string) => void }) {
  const qs = ranked.map((m) => ({ id: m.candidate_id, q: qualificationFor(m.candidate_id) }));
  const withQ = qs.filter((x) => x.q);
  const stagger = new Map([...withQ].sort((a, b) => a.q!.gpa - b.q!.gpa).map((w, i) => [w.id, i % 2]));
  const missing = qs.length - withQ.length;
  const min = 3.5;
  const max = 7;
  const x = (g: number) => ((g - min) / (max - min)) * 100;
  const bands = AU_CUTOFFS.map(([grade], i) => ({ grade, from: [6.5, 5.5, 4.5, 3.5][i], to: [7, 6.5, 5.5, 4.5][i] }));
  const aqf = new Map<string, number>();
  for (const { q } of withQ) aqf.set(`AQF ${q!.aqf} ${q!.aqf_label.split(" ")[0]}`, (aqf.get(`AQF ${q!.aqf} ${q!.aqf_label.split(" ")[0]}`) ?? 0) + 1);

  return (
    <div className="mt-5">
      <div className="relative h-24" role="img" aria-label={withQ.map(({ id, q }) => `Candidate ${id} GPA ${q!.gpa}, ${q!.average} average`).join("; ")}>
        <div className="absolute inset-x-0 bottom-0 flex h-7 overflow-hidden rounded-xs">
          {[...bands].reverse().map((b, i) => (
            <span key={b.grade} className={cn("flex h-full items-center justify-center border-r border-surface text-[10px] font-medium", ["bg-surface-sunken text-foreground-muted", "bg-surface-strong text-foreground-muted", "bg-primary-soft text-primary-text", "bg-primary-line text-primary-text"][i])} style={{ width: `${x(b.to) - x(b.from)}%` }}>
              {AU_SHORT[b.grade]}
            </span>
          ))}
        </div>
        {withQ.map(({ id, q }) => {
          const active = id === current;
          const high = !stagger.get(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              title={`Candidate ${id}: GPA ${q!.gpa.toFixed(1)}, ${q!.average} average, AQF ${q!.aqf}`}
              className="absolute bottom-7 flex -translate-x-1/2 flex-col items-center transition-[left] duration-500"
              style={{ left: `${x(q!.gpa)}%` }}
            >
              <span className={cn("num rounded-full border px-1.5 text-[10px] leading-4", active ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-foreground")}>{id}</span>
              <span aria-hidden="true" className={cn("w-px", high ? "h-8" : "h-2.5", active ? "bg-primary" : "bg-line-strong")} />
              <span aria-hidden="true" className={cn("-mb-1 h-2 w-2 rounded-full", active ? "bg-primary" : "bg-foreground")} />
            </button>
          );
        })}
      </div>
      <div className="num mt-1 flex justify-between text-[10px] text-foreground-muted">
        <span>GPA 3.5</span>
        <span>7.0</span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {[...aqf].sort().reverse().map(([label, n]) => (
          <li key={label}><Badge tone="brand"><CapIcon className="h-3 w-3" /> {label} · {n}</Badge></li>
        ))}
        <li><Badge tone="outline">No transcript · {missing}</Badge></li>
      </ul>
      {withQ.some((w) => w.id === current) && (
        <p className="mt-3 flex items-center gap-2 text-xs text-foreground-muted">
          Candidate {current}: <GradeChip grade={qualificationFor(current)!.average} /> average, GPA {qualificationFor(current)!.gpa.toFixed(1)}
        </p>
      )}
    </div>
  );
}
