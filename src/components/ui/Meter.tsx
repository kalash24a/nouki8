import { cn } from "@/lib/cn";

export function Meter({ value, max = 1, tone = "brand", className, label }: {
  value: number;
  max?: number;
  tone?: "brand" | "ochre" | "muted";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const fill = tone === "brand" ? "bg-primary" : tone === "ochre" ? "bg-accent-mark" : "bg-line-strong";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-strong", className)}
    >
      <div className={cn("animate-grow h-full rounded-full transition-[width] duration-500 ease-out-soft", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
