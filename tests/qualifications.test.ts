import { describe, expect, it } from "vitest";
import { candidates } from "@/lib/engine/data";
import { auGradeFor, convert, qualificationFor, records, rescale } from "@/lib/engine/qualifications";
import { identityTerms } from "@/lib/engine/redact";

const byId = new Map(candidates.map((c) => [c.id, c]));

describe("qualifications in Australian terms", () => {
  it("every unit grade is quoted verbatim from the candidate's own transcript", () => {
    for (const [cid, r] of Object.entries(records)) {
      const doc = byId.get(cid)?.documents.find((d) => d.id === r.document_id);
      expect(doc?.doc_type).toBe("transcript");
      for (const u of r.units) expect(doc!.text).toContain(`${u.unit} - ${u.grade}`);
    }
  });

  it("rescaling lines up pass marks and tops, and Australian grades pass through unchanged", () => {
    expect(rescale(40, 40)).toBe(50);
    expect(rescale(100, 75)).toBe(100);
    expect(convert("au", "Distinction")).toEqual({ mark: 75, grade: "Distinction" });
    expect(convert("au", "High Distinction").grade).toBe("High Distinction");
    expect(auGradeFor(49.9)).toBe("Fail");
  });

  it("a converted grade never reads higher than the bottom of its band", () => {
    expect(convert("wpu-legend", "Distinction")).toEqual({ mark: 79.2, grade: "Distinction" });
    expect(convert("wpu-legend", "Credit")).toEqual({ mark: 66.7, grade: "Credit" });
    expect(convert("vcu-legend", "3.0").grade).toBe("Pass");
    expect(convert("vcu-legend", "1.75")).toEqual({ mark: 80, grade: "Distinction" });
  });

  it("builds a summary with AQF level and GPA, and nothing for candidates without a transcript", () => {
    const c01 = qualificationFor("C01")!;
    expect([c01.aqf, c01.aqf_label, c01.gpa, c01.average]).toEqual([7, "Bachelor Degree", 5.7, "Distinction"]);
    expect(qualificationFor("C03")!.aqf).toBe(9);
    for (const cid of ["C04", "C05", "C06", "C08"]) expect(qualificationFor(cid)).toBeNull();
  });

  it("shows no personal detail in what the blind view displays", () => {
    for (const cid of Object.keys(records)) {
      const q = qualificationFor(cid)!;
      const blind = [q.award, q.field, q.aqf_label, ...q.units.map((u) => `${u.unit} ${u.grade}`)].join(" | ").toLowerCase();
      for (const term of identityTerms(byId.get(cid)!)) expect(blind).not.toContain(term.toLowerCase());
    }
  });
});
