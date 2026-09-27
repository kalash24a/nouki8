import { monthYear, RIGHTS, type RightsCategory, type WorkRights } from "@/lib/engine/workRights";
import { cn } from "@/lib/cn";
import { Badge, Rec } from "../ui/Rec";

export const RIGHTS_TONE: Record<RightsCategory, { chip: "positive" | "brand" | "ochre" | "neutral"; fill: string }> = {
  unrestricted: { chip: "positive", fill: "bg-positive" },
  temporary_full: { chip: "brand", fill: "bg-primary" },
  limited: { chip: "ochre", fill: "bg-accent-mark" },
  sponsorship: { chip: "neutral", fill: "bg-line-strong" },
};

export function VisaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
      <circle cx="8" cy="6.5" r="2.2" />
      <path d="M5.5 11.5h5" strokeLinecap="round" />
    </svg>
  );
}

function Verified({ rights }: { rights: WorkRights }) {
  return rights.verified === "vevo" ? (
    <Badge tone="positive" title="Checked in the Home Affairs VEVO system with the candidate's consent">VEVO-checked {monthYear(rights.as_of)}</Badge>
  ) : (
    <Badge tone="outline" title="Declared by the candidate, not yet checked">Self-declared</Badge>
  );
}

export function WorkRightsPanel({ rights, revealed, audience = "employer" }: { rights: WorkRights | null; revealed: boolean; audience?: "employer" | "candidate" }) {
  return (
    <div>
      <Rec as="h3" className="text-foreground-muted">Right to work in Australia</Rec>
      {!rights ? (
        <p className="mt-3 text-sm text-foreground-muted">Not declared yet.</p>
      ) : (
        <>
          <p className="mt-3 flex items-start gap-2 font-display text-2xl leading-tight">
            <span aria-hidden="true" className={cn("mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full", RIGHTS_TONE[rights.category].fill)} />
            {RIGHTS[rights.category].label}
          </p>
          <div className="mt-2">
            <Verified rights={rights} />
          </div>
          <p className="mt-2 text-sm text-foreground-muted">
            {revealed ? rights.visa ?? RIGHTS[rights.category].blurb : RIGHTS[rights.category].blurb}
            {rights.category === "temporary_full" && (rights.expires ? `, until ${monthYear(rights.expires)}` : ", no fixed end date")}.
          </p>
          {revealed && <p className="mt-1 text-sm text-foreground-muted">{rights.detail}</p>}
          <p className="mt-3 rounded-md border bg-surface-sunken px-3 py-2 text-xs text-foreground-muted">
            {audience === "candidate"
              ? "Employers see only the category until they move you forward. Your visa type appears after that."
              : revealed
                ? "Before an offer, confirm work rights in VEVO with the candidate's consent. Work rights are shown, not scored."
                : "Only the category is shown while the shortlist is blind. The visa type appears once you move someone forward. Work rights are shown, not scored."}
          </p>
        </>
      )}
    </div>
  );
}
