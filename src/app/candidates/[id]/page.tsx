import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PassportView } from "@/components/candidate/PassportView";
import { Arrow } from "@/components/ui/Button";
import { candidates } from "@/lib/engine/data";

export function generateStaticParams() {
  return candidates.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = candidates.find((x) => x.id === id);
  return { title: c ? `${c.identity.name}'s passport` : "Passport" };
}

export default async function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = candidates.find((c) => c.id === id);
  if (!candidate) notFound();

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/candidates" transitionTypes={["nav-back"]} className="inline-flex items-center gap-2 rounded-sm text-sm text-foreground-muted hover:text-foreground">
          <Arrow back /> All candidates
        </Link>
        <div className="mt-5">
          <PassportView candidate={candidate} />
        </div>
      </div>
    </ViewTransition>
  );
}
