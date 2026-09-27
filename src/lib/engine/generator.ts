import { Rng } from "./rng";

export const TEMPLATE_ID = "DA-CLEAN-01";
export const TITLE = "Clean and analyse a grocery orders extract";
export const MINUTES = 45;
export const MAPS_TO = ["T2", "T3", "T7"];
export const EXTRACT_DATE = "2026-08-31";

export const REGIONS: Record<string, string[]> = {
  VIC: ["VIC", "Vic", "Victoria"],
  NSW: ["NSW", "N.S.W.", "New South Wales"],
  QLD: ["QLD", "Qld", "Queensland"],
  SA: ["SA"],
  WA: ["WA"],
};
const CATEGORIES = ["Fresh", "Pantry", "Dairy", "Bakery", "Household"];
const PROMOS = ["SPRING10", "FRESH5", "WELCOME"];
export const COLUMNS = ["order_id", "order_date", "customer_id", "region", "category", "promo_code", "basket_value", "items"] as const;

export const BRIEF = [
  "You've joined the analytics team at a fictional online grocer. Marketing wants to know whether promo codes lift basket value and which region spends most. The attached extract has not been cleaned.",
  "Find and fix the data quality problems, and record what you found in the issue log.",
  "Answer the four questions using the cleaned data.",
  "Paste the code (Python, SQL or R) you used.",
  "Write a finding of 120 words or fewer for the marketing manager.",
];
export const RULES =
  "Drop exact duplicate rows, drop rows with a basket value of zero or less, drop orders dated after the extract date, and treat different spellings of the same state as one region. Keep genuine outliers.";

export type Row = {
  order_id: string;
  order_date: string;
  customer_id: string;
  region: string;
  category: string;
  promo_code: string;
  basket_value: number;
  items: number;
};

export type Truth = {
  duplicates: number;
  invalid_values: number;
  future_dates: number;
  top_region: string;
  avg_promo: number;
  avg_no_promo: number;
  clean_rows: number;
};

export type Instance = {
  seed: number;
  rows: Row[];
  truth: Truth;
  planted: { duplicates: number; invalid_values: number; future_dates: number; outlier_order: string };
};

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const round2 = (x: number) => Math.round(x * 100) / 100;

export function generate(seed: number, n = 400): Instance {
  const rng = new Rng(seed);
  const regionBias = Object.fromEntries(Object.keys(REGIONS).map((r) => [r, rng.uniform(55, 95)]));
  const promoLift = rng.uniform(1.05, 1.35);
  const clean: Row[] = [];
  for (let i = 0; i < n; i++) {
    const region = rng.choice(Object.keys(REGIONS));
    const promo = rng.random() < 0.35;
    const value = rng.gauss(regionBias[region], 18) * (promo ? promoLift : 1);
    clean.push({
      order_id: `O${String(seed % 1000).padStart(3, "0")}${String(i).padStart(4, "0")}`,
      order_date: addDays(EXTRACT_DATE, -rng.int(0, 120)),
      customer_id: `C${rng.int(1000, 1999)}`,
      region,
      category: rng.choice(CATEGORIES),
      promo_code: promo ? rng.choice(PROMOS) : "",
      basket_value: round2(Math.max(value, 5)),
      items: rng.int(1, 30),
    });
  }

  const messy = clean.map((r) => ({ ...r }));
  const idx = rng.shuffle([...messy.keys()]);
  const kInvalid = rng.int(4, 9);
  const kFuture = rng.int(3, 7);
  for (const i of idx.slice(0, kInvalid)) messy[i].basket_value = rng.random() < 0.5 ? 0 : -round2(rng.uniform(5, 60));
  for (const i of idx.slice(kInvalid, kInvalid + kFuture)) messy[i].order_date = addDays(EXTRACT_DATE, rng.int(1, 60));
  const outlierIdx = idx[kInvalid + kFuture];
  messy[outlierIdx].basket_value = round2(rng.uniform(900, 1500));
  for (const r of messy) {
    const variants = REGIONS[r.region];
    r.region = rng.random() < 0.7 ? variants[0] : rng.choice(variants);
  }

  const kDupes = rng.int(5, 12);
  const dupes = rng.shuffle([...messy.keys()]).slice(0, kDupes).map((i) => ({ ...messy[i] }));
  const rows = rng.shuffle([...messy, ...dupes]);

  return {
    seed,
    rows,
    truth: solve(rows),
    planted: { duplicates: kDupes, invalid_values: kInvalid, future_dates: kFuture, outlier_order: clean[outlierIdx].order_id },
  };
}

export function canonicalRegion(value: string): string {
  for (const [code, variants] of Object.entries(REGIONS)) if (variants.includes(value)) return code;
  return value;
}

const rowKey = (r: Row) => COLUMNS.map((c) => String(r[c])).join("\u0001");
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function solve(rows: Row[]): Truth {
  const seen = new Set<string>();
  const unique: Row[] = [];
  for (const r of rows) {
    const k = rowKey(r);
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(r);
    }
  }
  const duplicates = rows.length - unique.length;
  const valid = unique.filter((r) => r.basket_value > 0);
  const invalid_values = unique.length - valid.length;
  const current = valid.filter((r) => r.order_date <= EXTRACT_DATE);
  const future_dates = valid.length - current.length;
  const df = current.map((r) => ({ ...r, region: canonicalRegion(r.region) }));

  const byRegion = new Map<string, number[]>();
  for (const r of df) byRegion.set(r.region, [...(byRegion.get(r.region) ?? []), r.basket_value]);
  let top_region = "";
  let topMean = -Infinity;
  for (const region of [...byRegion.keys()].sort()) {
    const m = mean(byRegion.get(region)!);
    if (m > topMean) [top_region, topMean] = [region, m];
  }
  return {
    duplicates,
    invalid_values,
    future_dates,
    top_region,
    avg_promo: round2(mean(df.filter((r) => r.promo_code !== "").map((r) => r.basket_value))),
    avg_no_promo: round2(mean(df.filter((r) => r.promo_code === "").map((r) => r.basket_value))),
    clean_rows: df.length,
  };
}

export function toCsv(rows: Row[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

export function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    const o = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    return { ...o, basket_value: Number(o.basket_value), items: Number(o.items) } as Row;
  });
}
