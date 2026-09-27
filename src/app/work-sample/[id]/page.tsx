import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { WorkSampleFlow } from "@/components/worksample/WorkSampleFlow";
import { candidates } from "@/lib/engine/data";

export const metadata: Metadata = { title: "Work sample" };

export default async function WorkSamplePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ job?: string }> }) {
  const [{ id }, { job }] = await Promise.all([params, searchParams]);
  const candidate = candidates.find((c) => c.id === id);
  if (!candidate) notFound();
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div>
        <WorkSampleFlow candidate={candidate} initialJob={job} />
      </div>
    </ViewTransition>
  );
}
