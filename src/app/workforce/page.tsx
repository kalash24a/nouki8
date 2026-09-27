import type { Metadata } from "next";
import { WorkforceView } from "@/components/workforce/WorkforceView";

export const metadata: Metadata = { title: "Workforce planning" };

export default function WorkforcePage() {
  return <WorkforceView />;
}
