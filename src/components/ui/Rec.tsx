import { cn } from "@/lib/cn";

export function Rec({ children, className, as: As = "span", size = "default" }: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div" | "h2" | "h3" | "dt";
  size?: "default" | "sm";
}) {
  return <As className={cn(size === "sm" ? "rec-sm" : "rec", className)}>{children}</As>;
}

export type Tone = "neutral" | "brand" | "brandSolid" | "positive" | "ochre" | "info" | "red" | "outline";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-surface-sunken text-foreground-muted",
  brand: "border-primary-line bg-primary-soft text-primary-text",
  brandSolid: "border-primary bg-primary text-on-primary",
  positive: "border-positive-line bg-positive-soft text-positive",
  ochre: "border-accent-line bg-accent-soft text-accent",
  info: "border-info-soft bg-info-soft text-info",
  red: "border-destructive-soft bg-destructive-soft text-destructive",
  outline: "border-line-strong bg-transparent text-foreground-muted",
};

export function Badge({ children, tone = "neutral", className, title }: { children: React.ReactNode; tone?: Tone; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("rec-sm inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 normal-case tracking-normal", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, as: As = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <As className={cn("rounded-lg border bg-surface shadow-card", className)}>{children}</As>;
}

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3 w-3", className)} fill="none" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rounded-full bg-current", className)} />;
}
