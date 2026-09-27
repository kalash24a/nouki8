export type DocType = "cv" | "reference" | "transcript" | "project" | "work_sample" | "licence";
export type Band = "Strong" | "Moderate" | "Weak" | "Claimed only";
export type Status = "meets" | "below" | "unproven" | "missing";

export const Level = { NONE: 0, FOUNDATION: 1, WORKING: 2, PROFICIENT: 3, ADVANCED: 4 } as const;
export type Level = (typeof Level)[keyof typeof Level];
export const LEVEL_LABEL: Record<Level, string> = { 0: "—", 1: "Foundation", 2: "Working", 3: "Proficient", 4: "Advanced" };
export const LEVELS: Level[] = [1, 2, 3, 4];

export type Task = { id: string; label: string; kind: "osca_task" | "core_competency"; source: string; keywords: string[] };
export type Occupation = { code: string; title: string; classification: string; skill_level: number; url: string };
export type Identity = { name: string; country: string; institution: string; employers: string[] };
export type Doc = { id: string; doc_type: DocType; title: string; text: string; issued_by?: string; as_of: string };
export type Candidate = { id: string; identity: Identity; documents: Doc[]; note?: string };

export type Claim = {
  task_id: string;
  doc_id: string;
  doc_type: DocType;
  quote: string;
  tier: 1 | 2 | 3 | 4;
  as_of: string;
  level_signal: Level;
  level_cue: string;
};

export type PassportEntry = {
  task_id: string;
  band: Band;
  strength: number;
  level: Level;
  level_reason: string;
  cap_applied: string;
  dated: boolean;
  claims: Claim[];
};

export type Passport = { candidate_id: string; entries: Record<string, PassportEntry>; rejected_quotes: number; extractor: string };

export type Requirement = { task_id: string; target: Level; weight: number };
export type Job = { id: string; title: string; employer: string; description: string; requirements: Requirement[] };

export type RequirementResult = { task_id: string; target: Level; level: Level; band: Band | null; status: Status; points: number };
export type MatchResult = {
  candidate_id: string;
  score: number;
  met: number;
  total: number;
  results: RequirementResult[];
  to_prove: string[];
  explanation: string;
};
