import { rank } from "./matching";
import type { Candidate, Job, Passport } from "./types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function swapText(text: string, from: Candidate, to: Candidate): string {
  const pairs: [string, string][] = [
    [from.identity.name, to.identity.name],
    [from.identity.name.split(/\s+/)[0], to.identity.name.split(/\s+/)[0]],
    [from.identity.institution, to.identity.institution],
    [from.identity.country, to.identity.country],
    ...from.identity.employers.map((e, i): [string, string] => [e, to.identity.employers[i] ?? "Previous Employer"]),
  ];
  const placeholders: [string, string][] = [];
  pairs
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([a, b], i) => {
      const token = `\u0000${i}\u0000`;
      text = text.replace(new RegExp(`\\b${escape(a)}\\b`, "g"), token);
      placeholders.push([token, b]);
    });
  for (const [token, b] of placeholders) text = text.split(token).join(b);
  return text;
}

export function swappedPool(pool: Candidate[]): Candidate[] {
  return pool.map((c, i) => {
    const donor = pool[(i + 1) % pool.length];
    return { ...c, identity: donor.identity, documents: c.documents.map((d) => ({ ...d, text: swapText(d.text, c, donor) })) };
  });
}

export type SwapRow = {
  candidate: string;
  rankBefore: number;
  rankAfter: number;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  pass: boolean;
};

export function identitySwapTest(job: Job, pool: Candidate[], passportFn: (c: Candidate) => Passport): SwapRow[] {
  const before = rank(job, pool.map(passportFn));
  const after = rank(job, swappedPool(pool).map(passportFn));
  const b = new Map(before.map((m, i) => [m.candidate_id, [i + 1, m.score]]));
  const a = new Map(after.map((m, i) => [m.candidate_id, [i + 1, m.score]]));
  return [...b.keys()].map((cid) => {
    const [rb, sb] = b.get(cid)!;
    const [ra, sa] = a.get(cid)!;
    return { candidate: cid, rankBefore: rb, rankAfter: ra, scoreBefore: sb, scoreAfter: sa, delta: Math.round((sa - sb) * 100) / 100, pass: rb === ra && sb === sa };
  });
}
