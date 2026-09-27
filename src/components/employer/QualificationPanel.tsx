import { AU_SHORT, type AuGrade, type Qualification } from "@/lib/engine/qualifications";
import { cn } from "@/lib/cn";
import { Badge, Rec } from "../ui/Rec";

const GRADE_TONE: Record<AuGrade, "brandSolid" | "brand" | "positive" | "neutral" | "red"> = {
  "High Distinction": "brandSolid",
  Distinction: "brand",
  Credit: "positive",
  Pass: "neutral",
  Fail: "red",
};

export function GradeChip({ grade }: { grade: AuGrade }) {
  return (
    <Badge tone={GRADE_TONE[grade]} title={grade}>
      {AU_SHORT[grade]}
    </Badge>
  );
}

export function CapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 6 8 3l6.5 3L8 9z" />
      <path d="M4.5 7.5v3c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5v-3M14.5 6v3.5" strokeLinecap="round" />
    </svg>
  );
}

export function qualificationLine(q: Qualification | null) {
  if (!q) return "No transcript uploaded";
  return `AQF ${q.aqf} ${q.aqf_label.split(" ")[0]} · ${AU_SHORT[q.average]} average`;
}

export function QualificationPanel({ q, revealed, audience = "employer" }: { q: Qualification | null; revealed: boolean; audience?: "employer" | "candidate" }) {
  if (!q) {
    return (
      <div>
        <Rec as="h3" className="text-foreground-muted">Qualification in Australian terms</Rec>
        <p className="mt-3 text-sm text-foreground-muted">
          {audience === "employer"
            ? "No transcript uploaded. If the role needs a degree, ask for one when you move them forward."
            : "No transcript uploaded yet. Add one and employers will see your grades on the Australian scale."}
        </p>
      </div>
    );
  }
  const showOriginal = revealed && q.converted;
  return (
    <div>
      <Rec as="h3" className="text-foreground-muted">Qualification in Australian terms</Rec>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="font-display text-2xl leading-tight">
            {q.aqf_label} <span className="num text-base text-foreground-muted">· AQF {q.aqf}</span>
          </p>
          <p className="mt-0.5 text-sm text-foreground-muted">{q.award}, {q.field.toLowerCase()}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-2 text-sm">
            <GradeChip grade={q.average} /> {q.average} average
          </p>
          <p className="num mt-0.5 text-xs text-foreground-muted">GPA {q.gpa.toFixed(1)} of 7</p>
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Unit grades on the Australian scale</caption>
        <thead>
          <tr className="text-left text-xs text-foreground-muted">
            <th scope="col" className="pb-1.5 font-normal">Unit</th>
            {showOriginal && <th scope="col" className="pb-1.5 font-normal">As issued</th>}
            <th scope="col" className="pb-1.5 text-right font-normal">Australian grade</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {q.units.map((u) => (
            <tr key={u.unit}>
              <td className="py-2 pr-3">{u.unit}</td>
              {showOriginal && <td className="py-2 pr-3 text-foreground-muted">{u.original}</td>}
              <td className="py-2 text-right">
                <span className="inline-flex items-center gap-2">
                  <span className="num text-xs text-foreground-muted">≥{Math.round(u.mark)}</span>
                  <GradeChip grade={u.grade} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-2 rounded-md border bg-surface-sunken px-4 py-3 text-xs text-foreground-muted">
        <p>
          <strong className="font-medium text-foreground">Indicative, not a formal assessment.</strong> Grades use the common Australian cut-offs: HD 85, D 75, C 65, P 50. A
          grade from another scale is rescaled so its pass mark sits at 50 and its top at 100, then taken at the bottom of its band, so it never reads higher than it was.
          GPA is on the 7-point scale.
        </p>
        {revealed ? (
          <>
            <p>Issued on: {q.scale_label}{q.converted ? `, pass mark ${q.pass_mark}` : ""}.</p>
            {q.level_note && <p className="text-accent">{q.level_note}</p>}
          </>
        ) : (
          <p>The original grades and grading scale are shown once you move someone forward, because the scale can reveal where they studied.</p>
        )}
      </div>
    </div>
  );
}
