import type { Metadata } from "next";
import { ViewTransition } from "react";
import { CandidateList } from "@/components/candidate/CandidateList";
import { Rec } from "@/components/ui/Rec";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return (
    <ViewTransition
      enter={{ "nav-back": "nav-back", "nav-forward": "nav-forward", default: "none" }}
      exit={{ "nav-back": "nav-back", "nav-forward": "nav-forward", default: "none" }}
      default="none"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Rec className="text-primary-text">Candidate view</Rec>
        <h1 className="mt-2 text-4xl sm:text-5xl">Skill passports</h1>
        <p className="mt-3 max-w-2xl text-foreground-muted">
          Eight fictional candidates, each built to stress-test a rule: a strong overseas analyst, a supervised junior, a master&apos;s graduate
          with casual work, a career changer, a keyword-stuffed CV, dated senior experience, a domestic graduate and a data engineer.
        </p>
        <div className="mt-8">
          <CandidateList />
        </div>
      </div>
    </ViewTransition>
  );
}
