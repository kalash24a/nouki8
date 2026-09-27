import { occupation, taskLabel } from "./data";
import { TEMPLATE_ID, TITLE } from "./generator";
import { BAND_TO_LEVEL } from "./grader";
import { redact } from "./redact";
import { LEVEL_LABEL, type Candidate } from "./types";
import type { Attempt } from "./worksample";

export function credential(rec: Attempt, c: Candidate, named: boolean) {
  const bands = rec.review!.bands;
  const summary = rec.submission?.summary ?? "";
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: `urn:talentbridge:${rec.id}`,
    name: TITLE,
    issuer: { type: ["Profile"], id: "urn:talentbridge:issuer:prototype", name: "Talent Bridge (hackathon prototype, unsigned)" },
    validFrom: rec.submitted_at,
    credentialSubject: {
      type: ["AchievementSubject"],
      name: named ? c.identity.name : `Candidate ${c.id}`,
      achievement: {
        type: ["Achievement"],
        id: `urn:talentbridge:achievement:${TEMPLATE_ID}`,
        achievementType: "Assessment",
        name: TITLE,
        description: "Timed, seeded data-cleaning and analysis task with a follow-up viva.",
        criteria: { narrative: "Rubric bands per OSCA task, confirmed by a human reviewer. Counts as verified evidence only when the viva is defended." },
        alignment: Object.keys(bands).map((tid) => ({
          type: ["Alignment"],
          targetType: "ceterms:Occupation",
          targetName: taskLabel(tid),
          targetCode: `OSCA ${occupation.code} ${tid}`,
          targetUrl: occupation.url,
        })),
      },
      result: Object.entries(bands).map(([tid, band]) => ({
        type: ["Result"],
        resultDescription: `urn:rubric:${tid}`,
        achievedLevel: band,
        value: LEVEL_LABEL[BAND_TO_LEVEL[band!]],
      })),
    },
    evidence: [{ type: ["Evidence"], name: "Candidate's written finding", narrative: named ? summary : redact(summary, c) }],
    skillPassport: { attempt: rec.attempt, seed: rec.seed, defended: rec.review!.defended, minutes_taken: rec.minutes_taken },
  };
}
