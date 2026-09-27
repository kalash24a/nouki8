import type { Metadata } from "next";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";

export const metadata: Metadata = { title: "Employer dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ job?: string; post?: string }> }) {
  const { job, post } = await searchParams;
  return <EmployerDashboard initialJob={job} initialPost={post === "1"} />;
}
