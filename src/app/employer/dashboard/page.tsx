import type { Metadata } from "next";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";

export const metadata: Metadata = { title: "Employer dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  return <EmployerDashboard initialJob={job} />;
}
