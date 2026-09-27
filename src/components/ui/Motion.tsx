"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CountUp({ value, decimals = 0, suffix = "", duration = 900, className }: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const d = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = d ? Math.min(1, (now - start) / d) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function MatchRing({ value, size = 112, stroke = 9, label = "match" }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-strong" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - drawn / 100)}
          className="stroke-primary transition-[stroke-dashoffset] duration-[900ms] ease-out-soft motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={value} className="num text-2xl font-medium" suffix="%" />
        <span className="rec-sm text-foreground-muted">{label}</span>
      </div>
    </div>
  );
}
