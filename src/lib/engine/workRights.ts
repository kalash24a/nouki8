import workRightsJson from "@/data/work_rights.json";

export type RightsCategory = "unrestricted" | "temporary_full" | "limited" | "sponsorship";
export type WorkRights = {
  category: RightsCategory;
  visa: string | null;
  expires?: string | null;
  detail: string;
  verified: "vevo" | "self_declared";
  as_of: string;
};
export type RightsFilter = "any" | "no_sponsorship" | "full_time" | "unrestricted";

export const RIGHTS: Record<RightsCategory, { label: string; short: string; blurb: string }> = {
  unrestricted: { label: "Unrestricted work rights", short: "Unrestricted", blurb: "Citizen or permanent resident" },
  temporary_full: { label: "Full work rights, temporary visa", short: "Full, temporary", blurb: "Can work full time now" },
  limited: { label: "Limited hours", short: "Limited hours", blurb: "Student visa: 48 hours a fortnight during study periods" },
  sponsorship: { label: "Needs employer sponsorship", short: "Needs sponsorship", blurb: "For example Skills in Demand (subclass 482)" },
};

export const RIGHTS_ORDER: RightsCategory[] = ["unrestricted", "temporary_full", "limited", "sponsorship"];

const data = workRightsJson as Record<string, WorkRights>;

export function workRightsFor(candidateId: string): WorkRights | null {
  return data[candidateId] ?? null;
}

export function passesRights(rights: WorkRights | null, filter: RightsFilter): boolean {
  if (filter === "any") return true;
  if (!rights) return false;
  if (filter === "unrestricted") return rights.category === "unrestricted";
  if (filter === "full_time") return rights.category === "unrestricted" || rights.category === "temporary_full";
  return rights.category !== "sponsorship";
}

export const RIGHTS_FILTER_LABEL: Record<RightsFilter, string> = {
  any: "any work rights",
  no_sponsorship: "no sponsorship needed",
  full_time: "can work full time now",
  unrestricted: "unrestricted work rights",
};

export function blindLine(rights: WorkRights | null): string {
  if (!rights) return "Work rights not declared";
  const until = rights.category === "temporary_full" && rights.expires ? ` until ${monthYear(rights.expires)}` : "";
  return `${RIGHTS[rights.category].short}${until}`;
}

export function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" });
}
