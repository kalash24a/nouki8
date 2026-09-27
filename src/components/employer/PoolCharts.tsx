"use client";

import { useRef } from "react";
import { taskLabel, taskShort } from "@/lib/engine/data";
import { cumulative } from "@/lib/engine/filters";
import { LEVEL_LABEL, type Job, type MatchResult } from "@/lib/engine/types";
import { cn } from "@/lib/cn";
import { useTweened } from "../ui/chart";

function levelsFor(ranked: MatchResult[], job: Job) {
  return job.requirements.map((req, i) => {
    const lv: number[] = ranked.map((m) => m.results[i]?.level ?? 0);
    const n = lv.length || 1;
    return {
      task_id: req.task_id,
      target: req.target,
      avg: lv.reduce((s, x) => s + x, 0) / n,
      min: lv.length ? Math.min(...lv) : 0,
      max: lv.length ? Math.max(...lv) : 0,
      meet: ranked.filter((m) => m.results[i]?.status === "meets").length,
    };
  });
}

export function PoolRadar({ ranked, job }: { ranked: MatchResult[]; job: Job }) {
  const rows = levelsFor(ranked, job);
  const n = rows.length;
  const avg = useTweened(rows.map((r) => r.avg));
  const best = useTweened(rows.map((r) => r.max));
  const target = useTweened(rows.map((r) => r.target));
  const R = 88;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
  const pt = (i: number, l: number) => [(Math.cos(angle(i)) * R * l) / 4, (Math.sin(angle(i)) * R * l) / 4];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
  if (n < 3) return <p className="mt-4 text-sm text-foreground-muted">Add at least three requirements to draw the pool profile.</p>;
  const label = rows.map((r) => `${taskShort(r.task_id)}: average ${r.avg.toFixed(1)}, best ${LEVEL_LABEL[r.max as 0]}, target ${LEVEL_LABEL[r.target]}`).join("; ");

  return (
    <div>
      <svg viewBox="-176 -118 352 236" className="mx-auto w-full max-w-md" role="img" aria-label={`Pool profile across ${ranked.length} candidates. ${label}`}>
        {[1, 2, 3, 4].map((l) => (
          <polygon key={l} points={poly(Array(n).fill(l))} className="fill-none stroke-line" strokeWidth={l === 4 ? 1.2 : 0.8} />
        ))}
        {rows.map((r, i) => {
          const [x, y] = pt(i, 4);
          const [lx, ly] = pt(i, 4.85);
          return (
            <g key={r.task_id}>
              <line x1={0} y1={0} x2={x} y2={y} className="stroke-line" strokeWidth={0.8} />
              <text x={lx} y={ly + 3} textAnchor={Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end"} className="fill-foreground-muted text-[9px]">
                {taskShort(r.task_id)}
              </text>
            </g>
          );
        })}
        <polygon points={poly(best)} className="fill-none stroke-accent-mark" strokeWidth={1.6} strokeLinejoin="round" />
        <polygon points={poly(avg)} className="fill-primary/30 stroke-primary" strokeWidth={2} strokeLinejoin="round" />
        <polygon points={poly(target)} className="fill-none stroke-foreground" strokeWidth={1.4} strokeDasharray="4 3" />
        {["F", "W", "P", "A"].map((t, i) => (
          <text key={t} x={3} y={-(R * (i + 1)) / 4 + 3} className="fill-foreground-muted text-[7px]">{t}</text>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-foreground-muted">
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-foreground" /> Your target</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-4 rounded-xs border-2 border-primary bg-primary/30" /> Pool average</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0 w-5 border-t-2 border-accent-mark" /> Best in pool</li>
      </ul>
    </div>
  );
}

export function RangeBullets({ ranked, job }: { ranked: MatchResult[]; job: Job }) {
  const rows = levelsFor(ranked, job);
  const x = (l: number) => `${(l / 4) * 100}%`;
  return (
    <div className="mt-5">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] gap-x-3 text-[10px] text-foreground-muted">
        <span />
        <span className="relative h-3">
          {["None", "F", "W", "P", "A"].map((t, i) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: x(i) }}>{t}</span>
          ))}
        </span>
        <span className="text-right">meet</span>
      </div>
      <ul className="mt-1 space-y-2.5">
        {rows.map((r) => {
          const below = r.avg < r.target;
          return (
            <li key={r.task_id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-x-3">
              <span className="truncate text-sm" title={taskLabel(r.task_id)}>{taskShort(r.task_id)}</span>
              <span
                className="relative h-7 rounded-xs bg-surface-sunken"
                role="img"
                aria-label={`${taskShort(r.task_id)}: range ${LEVEL_LABEL[r.min as 0]} to ${LEVEL_LABEL[r.max as 0]}, average ${r.avg.toFixed(1)} of 4, target ${LEVEL_LABEL[r.target]}`}
              >
                {[1, 2, 3].map((g) => <span key={g} aria-hidden="true" className="absolute inset-y-0 w-px bg-line" style={{ left: x(g) }} />)}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 rounded-full bg-primary-line transition-[left,width] duration-500"
                  style={{ left: x(r.min), width: `max(calc(${x(r.max)} - ${x(r.min)}), 4px)` }}
                />
                <span
                  aria-hidden="true"
                  className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-surface transition-[left] duration-500", below ? "bg-accent-mark" : "bg-primary")}
                  style={{ left: x(r.avg) }}
                />
                <span aria-hidden="true" className="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground transition-[left] duration-500" style={{ left: x(r.target) }} />
              </span>
              <span className="num text-right text-xs">{r.meet}/{ranked.length}</span>
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-foreground-muted">
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-5 rounded-full bg-primary-line" /> Lowest to highest</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-primary" /> Average, at or above target</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-accent-mark" /> Average, below target</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-foreground" /> Your target</li>
      </ul>
    </div>
  );
}

const W = 640;
const H = 250;
const PAD = { l: 34, r: 14, t: 26, b: 40 };

export function CumulativeCurve({ pool, eligible, kept, minScore, onMinScore }: {
  pool: MatchResult[];
  eligible: MatchResult[];
  kept: Set<string>;
  minScore: number;
  onMinScore: (v: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const N = Math.max(pool.length, 1);
  const sx = (s: number) => PAD.l + (s / 100) * (W - PAD.l - PAD.r);
  const sy = (c: number) => PAD.t + (1 - c / N) * (H - PAD.t - PAD.b);
  const bottom = sy(0);

  const step = (scores: number[]) => {
    const pts = cumulative(scores);
    let d = `M${sx(0)},${sy(pts[0].count)}`;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].count !== pts[i - 1].count) d += ` H${sx(pts[i].x).toFixed(1)} V${sy(pts[i].count).toFixed(1)}`;
    }
    return d + ` H${sx(100)}`;
  };
  const poolPath = step(pool.map((m) => m.score));
  const eligPath = step(eligible.map((m) => m.score));
  const clearing = eligible.filter((m) => m.score >= minScore).length;
  const tx = sx(minScore);

  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = svgRef.current!.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    const s = Math.max(0, Math.min(100, ((vx - PAD.l) / (W - PAD.l - PAD.r)) * 100));
    onMinScore(Math.round(s / 5) * 5);
  };

  const sorted = [...pool].sort((a, b) => a.score - b.score);
  const lane = new Map<string, number>();
  sorted.forEach((m, i) => {
    const prev = sorted[i - 1];
    lane.set(m.candidate_id, prev && Math.abs(prev.score - m.score) < 4 ? ((lane.get(prev.candidate_id) ?? 0) + 1) % 3 : 0);
  });

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full cursor-crosshair select-none"
        onClick={pick}
        role="img"
        aria-label={`${clearing} of ${eligible.length} candidates who pass your other filters clear a ${minScore}% match. Whole pool: ${pool.length}.`}
      >
        {Array.from({ length: N + 1 }, (_, c) => c).filter((c) => N <= 10 || c % 2 === 0).map((c) => (
          <g key={c}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(c)} y2={sy(c)} className="stroke-line" strokeWidth={c === 0 ? 1 : 0.6} />
            <text x={PAD.l - 8} y={sy(c) + 3} textAnchor="end" className="num fill-foreground-muted text-[10px]">{c}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((s) => (
          <text key={s} x={sx(s)} y={bottom + 30} textAnchor="middle" className="num fill-foreground-muted text-[10px]">{s}%</text>
        ))}
        <rect x={tx} y={PAD.t} width={Math.max(sx(100) - tx, 0)} height={bottom - PAD.t} className="fill-positive/10 transition-[x,width] duration-300" />
        <path d={poolPath} className="fill-none stroke-line-strong" strokeWidth={1.5} strokeDasharray="3 3" />
        <path d={`${eligPath} V${bottom} H${sx(0)} Z`} className="fill-primary/15" />
        <path d={eligPath} className="fill-none stroke-primary" strokeWidth={2.2} strokeLinejoin="round" />
        {pool.map((m) => {
          const on = kept.has(m.candidate_id);
          const y = bottom + 8 + (lane.get(m.candidate_id) ?? 0) * 7;
          return (
            <circle key={m.candidate_id} cx={sx(m.score)} cy={y} r={3.4} className={cn(on ? "fill-primary stroke-surface" : "fill-surface stroke-line-strong", "transition-[cx] duration-500")} strokeWidth={1.3}>
              <title>{`Candidate ${m.candidate_id}: ${Math.round(m.score)}%${on ? "" : " (filtered out)"}`}</title>
            </circle>
          );
        })}
        <line x1={tx} x2={tx} y1={PAD.t - 6} y2={bottom} className="stroke-positive transition-[x1,x2] duration-300" strokeWidth={2} />
        <text x={Math.min(tx + 6, W - 150)} y={PAD.t - 10} className="fill-positive text-[11px] font-medium">
          {clearing} of {eligible.length} clear {minScore}%
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex min-w-[14rem] flex-1 items-center gap-3 text-sm">
          <span className="whitespace-nowrap text-foreground-muted">Minimum match</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => onMinScore(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
          <span className="num w-10 text-right font-medium">{minScore}%</span>
        </label>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-foreground-muted">
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0 w-5 border-t-2 border-primary" /> Passing your other filters</li>
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-line-strong" /> Whole pool</li>
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" /> Kept</li>
          <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-line-strong" /> Filtered out</li>
        </ul>
      </div>
    </div>
  );
}
