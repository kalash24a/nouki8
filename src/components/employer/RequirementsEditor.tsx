"use client";

import { taskList, taskShort } from "@/lib/engine/data";
import { LEVEL_LABEL, LEVELS, type Level, type Requirement } from "@/lib/engine/types";
import { cn } from "@/lib/cn";
import { Rec } from "../ui/Rec";

const WEIGHTS = [0.5, 1, 1.5, 2];

export function RequirementsEditor({ requirements, onChange, compact = false }: { requirements: Requirement[]; onChange: (next: Requirement[]) => void; compact?: boolean }) {
  const byId = new Map(requirements.map((r) => [r.task_id, r]));

  const set = (taskId: string, patch: Partial<Requirement> | null) => {
    if (patch === null) return onChange(requirements.filter((r) => r.task_id !== taskId));
    const current = byId.get(taskId);
    if (current) return onChange(requirements.map((r) => (r.task_id === taskId ? { ...r, ...patch } : r)));
    onChange([...requirements, { task_id: taskId, target: 2 as Level, weight: 1, ...patch }]);
  };

  return (
    <div className="divide-y">
      {taskList.map((t) => {
        const req = byId.get(t.id);
        return (
          <div key={t.id} className={cn("grid gap-3 py-3", compact ? "gap-2" : "sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center", !req && "opacity-60")}>
            <label className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                checked={!!req}
                onChange={(e) => set(t.id, e.target.checked ? {} : null)}
                className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  <span className="rec-sm mr-1.5 text-foreground-muted">{t.id}</span>
                  {taskShort(t.id)}
                </span>
                <span className="block truncate text-xs text-foreground-muted" title={t.label}>{t.label}</span>
              </span>
            </label>
            <div role="radiogroup" aria-label={`Target level for ${taskShort(t.id)}`} className="flex rounded-sm border bg-surface-sunken p-0.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={req?.target === l}
                  disabled={!req}
                  onClick={() => set(t.id, { target: l })}
                  className={cn(
                    "min-h-8 rounded-xs px-2.5 text-xs transition-colors",
                    req?.target === l ? "bg-primary text-on-primary shadow-card" : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground-muted">
              <Rec size="sm">Weight</Rec>
              <select
                value={req?.weight ?? 1}
                disabled={!req}
                onChange={(e) => set(t.id, { weight: Number(e.target.value) })}
                className="min-h-8 rounded-sm border bg-surface px-2 text-sm text-foreground"
              >
                {WEIGHTS.map((w) => (
                  <option key={w} value={w}>×{w}</option>
                ))}
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}
