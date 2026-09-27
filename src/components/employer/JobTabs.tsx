"use client";

import Link from "next/link";
import type { Job } from "@/lib/engine/types";
import { isPosted } from "@/lib/useJobs";
import { cn } from "@/lib/cn";

export function JobTabs({ jobs, activeId, onSelect, onPost, postHref }: {
  jobs: Job[];
  activeId: string;
  onSelect: (id: string) => void;
  onPost?: () => void;
  postHref?: string;
}) {
  const post = "inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-dashed border-primary-line px-3 text-sm text-primary-text transition-colors hover:border-primary hover:bg-primary-soft";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Role" className="inline-flex max-w-full flex-wrap rounded-sm border bg-surface-sunken p-0.5">
        {jobs.map((j) => (
          <button
            key={j.id}
            role="tab"
            aria-selected={j.id === activeId}
            onClick={() => onSelect(j.id)}
            className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-xs px-3 text-sm transition-colors", j.id === activeId ? "bg-surface font-medium shadow-card" : "text-foreground-muted hover:text-foreground")}
          >
            {isPosted(j) && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />}
            {j.title}
            {isPosted(j) && <span className="sr-only"> (posted by you)</span>}
          </button>
        ))}
      </div>
      {onPost ? (
        <button type="button" onClick={onPost} className={post}>
          <Plus /> Post a job
        </button>
      ) : postHref ? (
        <Link href={postHref} className={post} transitionTypes={["nav-forward"]}>
          <Plus /> Post a job
        </Link>
      ) : null}
    </div>
  );
}

function Plus() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
