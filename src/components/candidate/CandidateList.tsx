"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { candidates, taskList } from "@/lib/engine/data";
import { usePassports } from "@/lib/usePassports";
import { Badge, Card } from "../ui/Rec";
import { Meter } from "../ui/Meter";

const DOC_LABEL: Record<string, string> = { cv: "CV", reference: "Reference", transcript: "Transcript", project: "Project" };

export function CandidateList() {
  const passports = usePassports();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((c) => {
        const p = passports.get(c.id)!;
        const entries = Object.values(p.entries);
        const strong = entries.filter((e) => e.band === "Strong").length;
        const trusted = entries.filter((e) => e.band === "Strong" || e.band === "Moderate").length;
        return (
          <li key={c.id}>
            <Link href={`/candidates/${c.id}`} transitionTypes={["nav-forward"]} className="group block h-full rounded-lg">
              <Card className="flex h-full flex-col p-5 transition-[box-shadow,border-color] duration-200 group-hover:border-line-strong group-hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <ViewTransition name={`avatar-${c.id}`} share="morph" default="none">
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg text-primary-text">
                      {c.identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                  </ViewTransition>
                  <span className="num text-xs text-foreground-muted">{c.id}</span>
                </div>
                <ViewTransition name={`name-${c.id}`} share="text-morph" default="none">
                  <h2 className="mt-4 w-fit text-2xl">{c.identity.name}</h2>
                </ViewTransition>
                <p className="mt-1 text-sm text-foreground-muted">{c.note}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.documents.map((d) => (
                    <Badge key={d.id} tone="neutral">{DOC_LABEL[d.doc_type] ?? d.doc_type}</Badge>
                  ))}
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{trusted} of {taskList.length} tasks with trusted evidence</span>
                    <span>{strong} strong</span>
                  </div>
                  <Meter className="mt-2" value={trusted} max={taskList.length} />
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
