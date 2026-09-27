import llmClaims from "@/data/llm-claims.json";
import { taskList, tasks } from "./data";
import { Level, type Candidate, type Claim, type Doc } from "./types";

const BASE_TIER: Record<Doc["doc_type"], Claim["tier"]> = {
  work_sample: 1, licence: 1, reference: 2, transcript: 2, cv: 3, project: 3,
};

const LEVEL_CUES: [Level, RegExp][] = [
  [Level.FOUNDATION, /\bassist(ed|ing)?\b|under the (guidance|supervision)|\bsupported\b|\bhelped\b|\bcompleted an? (online )?course\b|\bintern\b/i],
  [Level.ADVANCED, /\bset the (analytics )?strategy\b|\baccountable for\b|\bestablished (our|the)\b|\bhead of\b/i],
  [Level.PROFICIENT, /\bled\b|\bdesigned\b|\bowned\b|\bmentored\b|\bmanaged\b|\bsupervised\b|\barchitected\b/i],
  [Level.WORKING, /\bindependently\b|\bbuilt\b|\bdeveloped\b|\bdelivered\b|\bproduced\b|\bprepared\b|\bpresented\b|\banalysed\b|\banalyzed\b|\bimplemented\b|\bautomated?\b|\breconciled\b|\bwrote\b|\bcreated\b|\bcoordinated\b|\btrained\b/i],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEYWORD_RES = Object.fromEntries(
  taskList.map((t) => [t.id, t.keywords.map((k) => new RegExp("\\b" + escape(k)))]),
);

export const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase().replace(/^[ .;,]+|[ .;,]+$/g, "");

export function sentences(text: string): string[] {
  return text.split(/\r?\n/).flatMap((line) => line.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean));
}

export function tierFor(doc: Doc, quote: string): Claim["tier"] {
  if (doc.doc_type === "cv" && norm(quote).startsWith("skills:")) return 4;
  return BASE_TIER[doc.doc_type];
}

export function levelSignal(doc: Doc, quote: string, tier: number): [Level, string] {
  if (tier === 4) return [Level.NONE, "skills list only"];
  for (const [level, re] of LEVEL_CUES) {
    const m = quote.match(re);
    if (m) return [level, `'${m[0]}'`];
  }
  if (doc.doc_type === "transcript" || doc.doc_type === "project") return [Level.FOUNDATION, "coursework or project default"];
  return [Level.WORKING, "documented duty default"];
}

export function makeClaim(doc: Doc, taskId: string, quote: string): Claim {
  const tier = tierFor(doc, quote);
  const [level_signal, level_cue] = levelSignal(doc, quote, tier);
  return { task_id: taskId, doc_id: doc.id, doc_type: doc.doc_type, quote, tier, as_of: doc.as_of, level_signal, level_cue };
}

export function extractKeyword(doc: Doc): Claim[] {
  const claims: Claim[] = [];
  for (const sentence of sentences(doc.text)) {
    const low = sentence.toLowerCase();
    for (const task of taskList) {
      if (KEYWORD_RES[task.id].some((re) => re.test(low))) claims.push(makeClaim(doc, task.id, sentence));
    }
  }
  return claims;
}

type RawClaim = { task_id?: string; quote?: string };

export function validateLlmClaims(doc: Doc, raw: RawClaim[]): { claims: Claim[]; rejected: number } {
  const haystack = norm(doc.text);
  const seen = new Set<string>();
  const claims: Claim[] = [];
  let rejected = 0;
  for (const item of raw) {
    const tid = item.task_id ?? "";
    const quote = (item.quote ?? "").trim();
    if (!tasks[tid] || !quote || !haystack.includes(norm(quote))) {
      rejected += 1;
      continue;
    }
    const key = `${tid}|${norm(quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claims.push(makeClaim(doc, tid, quote));
  }
  return { claims, rejected };
}

const CACHE = llmClaims as Record<string, { text_hash: string; claims: RawClaim[] }>;

export function textHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

export function extractCandidate(c: Candidate): { claims: Claim[]; rejected: number; extractor: string } {
  let claims: Claim[] = [];
  let rejected = 0;
  let llmDocs = 0;
  for (const doc of c.documents) {
    const cached = CACHE[doc.id];
    if (cached && cached.text_hash === textHash(doc.text)) {
      const r = validateLlmClaims(doc, cached.claims);
      claims = claims.concat(r.claims);
      rejected += r.rejected;
      llmDocs += 1;
    } else {
      claims = claims.concat(extractKeyword(doc));
    }
  }
  const extractor = llmDocs === c.documents.length ? "llm" : llmDocs === 0 ? "keyword" : "mixed";
  return { claims, rejected, extractor };
}
