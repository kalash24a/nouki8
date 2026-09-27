"use client";

import { useEffect, useRef, useState } from "react";

function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTweened(target: number[], duration = 650) {
  const [shown, setShown] = useState(() => target.map(() => 0));
  const from = useRef<number[]>(target.map(() => 0));
  const key = target.join(",");
  useEffect(() => {
    const goal = key ? key.split(",").map(Number) : [];
    const origin = goal.map((_, i) => from.current[i] ?? 0);
    const d = reduced() ? 0 : duration;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = d ? Math.min(1, (now - start) / d) : 1;
      const e = 1 - Math.pow(1 - t, 3);
      setShown(goal.map((g, i) => origin[i] + (g - origin[i]) * e));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = goal;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, duration]);
  return shown.length === target.length ? shown : target;
}

export function ChartHead({ title, note, children }: { title: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl">{title}</h2>
        {note && <p className="mt-1 max-w-prose text-sm text-foreground-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string | number | null>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap rounded-sm border bg-surface-sunken p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "min-h-8 flex-1 whitespace-nowrap rounded-xs px-2 text-xs transition-colors " +
            (value === o.value ? "bg-primary text-on-primary shadow-card" : "text-foreground-muted hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
