"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/employer", label: "Employer", exact: true },
  { href: "/employer/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
  { href: "/work-sample/C01", label: "Work sample", match: "/work-sample" },
  { href: "/workforce", label: "Workforce" },
  { href: "/method", label: "How it works" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5" className="fill-primary" />
        <path d="M5 15.5h14M6 15.5c1.8-4.2 3.8-6 6-6s4.2 1.8 6 6M8.6 11.6v3.9M12 9.5v6M15.4 11.6v3.9" fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-on-primary" />
      </svg>
      <span translate="no" className="font-display text-lg font-semibold tracking-tight">Talent Bridge</span>
    </span>
  );
}

export function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-sm" aria-label="Talent Bridge home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="-mx-2 flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = "exact" in n && n.exact ? path === n.href : path.startsWith(n.match ?? n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-sm px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary-soft font-medium text-primary-text" : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <span className="rec-sm hidden rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-accent lg:inline">
          Prototype · fictional data
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
