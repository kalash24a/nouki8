"use client";

import { startTransition, useState, ViewTransition } from "react";
import { candidates } from "@/lib/engine/data";
import { identitySwapTest, swappedPool, type SwapRow } from "@/lib/engine/fairness";
import { passportFor, todayIso } from "@/lib/engine/scoring";
import type { Candidate, Job } from "@/lib/engine/types";
import { claimsFor } from "@/lib/engine/worksample";
import { useAppState } from "@/lib/store";
import { Button } from "../ui/Button";
import { Badge, Card, Check, Rec } from "../ui/Rec";

export function FairnessPanel({ job }: { job: Job }) {
  const { attempts } = useAppState();
  const [rows, setRows] = useState<SwapRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const swapped = new Map(swappedPool(candidates).map((c) => [c.id, c.identity]));

  const run = () => {
    setRunning(true);
    requestAnimationFrame(() => {
      const today = todayIso();
      const fn = (c: Candidate) => passportFor(c, today, claimsFor(attempts, c.id));
      const result = identitySwapTest(job, candidates, fn);
      startTransition(() => {
        setRows(result);
        setRunning(false);
      });
    });
  };

  const failed = rows?.filter((r) => !r.pass) ?? [];

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Rec className="text-primary-text">Fairness check</Rec>
          <h2 className="mt-1 text-2xl">Swap every identity, re-run everything</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Each candidate takes the next candidate&apos;s name, country, university and employers, rewritten inside every document. The whole
            pipeline runs again from the documents up. If anything about identity leaked into the scoring, someone would move.
          </p>
        </div>
        <Button onClick={run} disabled={running}>{running ? "Running…" : rows ? "Run again" : "Run identity-swap test"}</Button>
      </div>

      {rows && (
        <ViewTransition enter="slide-up" exit="slide-down" default="none">
          <div className="mt-6">
            <p
              role="status"
              className={
                "animate-pulse-ring flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium " +
                (failed.length ? "bg-destructive-soft text-destructive" : "bg-positive-soft text-positive")
              }
            >
              {failed.length ? (
                <>Fail: {failed.length} candidate(s) moved.</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Pass: all {rows.length} candidates kept the same score and rank after the swap.
                </>
              )}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-foreground-muted">
                    <th className="rec-sm py-2 font-medium">Candidate</th>
                    <th className="rec-sm py-2 font-medium">Now named</th>
                    <th className="rec-sm py-2 text-right font-medium">Rank</th>
                    <th className="rec-sm py-2 text-right font-medium">Score</th>
                    <th className="rec-sm py-2 text-right font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.candidate} className="animate-rise border-t" style={{ animationDelay: `${i * 45}ms` }}>
                      <td className="num py-2">{r.candidate}</td>
                      <td className="py-2 text-foreground-muted">
                        {swapped.get(r.candidate)?.name} · {swapped.get(r.candidate)?.country}
                      </td>
                      <td className="num py-2 text-right">{r.rankBefore} → {r.rankAfter}</td>
                      <td className="num py-2 text-right">{r.scoreBefore.toFixed(1)} → {r.scoreAfter.toFixed(1)}</td>
                      <td className="py-2 text-right">{r.pass ? <Badge tone="positive"><Check /> unchanged</Badge> : <Badge tone="red">moved</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Known limit: redaction hides names, countries, universities and employers. City names and pronouns can still leak, and the test does not swap them.
            </p>
          </div>
        </ViewTransition>
      )}
    </Card>
  );
}
