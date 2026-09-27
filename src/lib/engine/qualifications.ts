import qualificationsJson from "@/data/qualifications.json";
import { roundHalfEven } from "./scoring";

export type AuGrade = "High Distinction" | "Distinction" | "Credit" | "Pass" | "Fail";
export const AU_SHORT: Record<AuGrade, string> = { "High Distinction": "HD", Distinction: "D", Credit: "C", Pass: "P", Fail: "N" };
export const GPA_POINTS: Record<AuGrade, number> = { "High Distinction": 7, Distinction: 6, Credit: 5, Pass: 4, Fail: 0 };

export const AU_CUTOFFS: [AuGrade, number][] = [
  ["High Distinction", 85],
  ["Distinction", 75],
  ["Credit", 65],
  ["Pass", 50],
];

export const AQF: Record<number, string> = {
  5: "Diploma",
  6: "Advanced Diploma or Associate Degree",
  7: "Bachelor Degree",
  8: "Bachelor Honours, Graduate Certificate or Graduate Diploma",
  9: "Masters Degree",
  10: "Doctoral Degree",
};

type Scale = { label: string; pass_mark: number; grades: Record<string, [number, number]> };
type RecordJson = {
  document_id: string;
  award: string;
  field: string;
  aqf: number;
  duration_years?: number;
  scale: string;
  units: { unit: string; grade: string }[];
  level_note?: string;
};

export const scales = qualificationsJson.scales as unknown as Record<string, Scale>;
export const records = qualificationsJson.records as unknown as Record<string, RecordJson>;

export type ConvertedUnit = { unit: string; original: string; mark: number; grade: AuGrade; converted: boolean };
export type Qualification = {
  candidate_id: string;
  document_id: string;
  award: string;
  field: string;
  aqf: number;
  aqf_label: string;
  level_note?: string;
  scale_label: string;
  pass_mark: number;
  converted: boolean;
  units: ConvertedUnit[];
  gpa: number;
  average: AuGrade;
};

export function auGradeFor(mark: number): AuGrade {
  for (const [g, cut] of AU_CUTOFFS) if (mark >= cut) return g;
  return "Fail";
}

export function rescale(lowerBound: number, passMark: number): number {
  if (lowerBound < passMark) return (lowerBound / passMark) * 50;
  return 50 + ((lowerBound - passMark) / (100 - passMark)) * 50;
}

export function convert(scaleId: string, grade: string): { mark: number; grade: AuGrade } {
  const scale = scales[scaleId];
  const band = scale?.grades[grade];
  if (!band) throw new Error(`Grade "${grade}" is not on scale ${scaleId}`);
  const mark = roundHalfEven(rescale(band[0], scale.pass_mark), 1);
  return { mark, grade: auGradeFor(mark) };
}

export function averageGrade(gpa: number): AuGrade {
  if (gpa >= 6.5) return "High Distinction";
  if (gpa >= 5.5) return "Distinction";
  if (gpa >= 4.5) return "Credit";
  if (gpa >= 3.5) return "Pass";
  return "Fail";
}

export function qualificationFor(candidateId: string): Qualification | null {
  const r = records[candidateId];
  if (!r) return null;
  const scale = scales[r.scale];
  const converted = r.scale !== "au";
  const units = r.units.map((u) => ({ unit: u.unit, original: u.grade, converted, ...convert(r.scale, u.grade) }));
  const gpa = roundHalfEven(units.reduce((s, u) => s + GPA_POINTS[u.grade], 0) / units.length, 1);
  return {
    candidate_id: candidateId,
    document_id: r.document_id,
    award: r.award,
    field: r.field,
    aqf: r.aqf,
    aqf_label: AQF[r.aqf] ?? `AQF ${r.aqf}`,
    level_note: r.level_note,
    scale_label: scale.label,
    pass_mark: scale.pass_mark,
    converted,
    units,
    gpa,
    average: averageGrade(gpa),
  };
}
