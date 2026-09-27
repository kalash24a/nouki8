import type { Candidate } from "./types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function identityTerms(c: Candidate): string[] {
  const { name, country, institution, employers } = c.identity;
  const terms = new Set([name, ...name.split(/\s+/), country, institution, ...employers].filter((t) => t && t.length > 2));
  return [...terms].sort((a, b) => b.length - a.length);
}

export function redact(text: string, c: Candidate): string {
  return identityTerms(c).reduce((out, term) => out.replace(new RegExp(escape(term), "gi"), "[redacted]"), text);
}
