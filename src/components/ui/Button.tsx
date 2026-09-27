import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium text-center " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out-soft " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-card",
  secondary: "border border-line-strong bg-surface text-foreground hover:border-primary hover:text-primary-text",
  quiet: "text-foreground underline decoration-line-strong underline-offset-4 hover:decoration-primary hover:text-primary-text",
  ghost: "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

type Props = { variant?: Variant; size?: Size; className?: string; children: React.ReactNode };

export function Button({ variant = "primary", size = "md", className, children, ...rest }: Props & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", className, children, ...rest }: Props & React.ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

export function Arrow({ className, back = false }: { className?: string; back?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("h-3.5 w-3.5", back && "rotate-180", className)} fill="none" aria-hidden="true">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
