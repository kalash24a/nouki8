import { TIER_NAME } from "@/lib/engine/scoring";
import { LEVEL_LABEL, type Band, type Level, type Status } from "@/lib/engine/types";
import { Badge, Check, type Tone } from "./Rec";

const BAND_TONE: Record<Band, Tone> = { Strong: "brandSolid", Moderate: "brand", Weak: "ochre", "Claimed only": "outline" };

export function BandChip({ band }: { band: Band | null }) {
  if (!band) return <Badge tone="outline">No evidence</Badge>;
  return <Badge tone={BAND_TONE[band]}>{band}</Badge>;
}

const STATUS: Record<Status, { tone: Tone; label: string }> = {
  meets: { tone: "positive", label: "Meets target" },
  below: { tone: "ochre", label: "Below target" },
  unproven: { tone: "ochre", label: "Unproven" },
  missing: { tone: "outline", label: "No evidence" },
};

export function StatusChip({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone}>
      {status === "meets" && <Check />}
      {s.label}
    </Badge>
  );
}

const TIER_TONE: Record<number, Tone> = { 1: "brandSolid", 2: "brand", 3: "neutral", 4: "outline" };

export function TierChip({ tier }: { tier: number }) {
  return (
    <Badge tone={TIER_TONE[tier]} title={`Tier ${tier}: ${TIER_NAME[tier]}`}>
      Tier {tier} · {TIER_NAME[tier]}
    </Badge>
  );
}

export function LevelPips({ level, target, label = true }: { level: Level; target?: Level; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={
              "h-2 w-3.5 rounded-xs border " +
              (i <= level ? "border-primary bg-primary" : target && i <= target ? "border-accent-mark bg-accent-soft" : "border-line bg-surface-sunken")
            }
          />
        ))}
      </span>
      {label && <span className="text-xs text-foreground-muted">{LEVEL_LABEL[level]}{target ? ` / ${LEVEL_LABEL[target]}` : ""}</span>}
    </span>
  );
}
