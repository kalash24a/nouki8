import type { Metadata } from "next";
import { EmployerView } from "@/components/employer/EmployerView";

export const metadata: Metadata = { title: "Employer shortlist" };

export default async function EmployerPage({ searchParams }: { searchParams: Promise<{ job?: string; candidate?: string }> }) {
  const { job, candidate } = await searchParams;
  return <EmployerView initialJob={job} initialCandidate={candidate} />;
}
