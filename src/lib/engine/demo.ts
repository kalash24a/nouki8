import type { Instance } from "./generator";
import type { Submission } from "./grader";

export const DEMO_SEED = 4821;

export const VIVA_ANSWERS = [
  "I treated rows as duplicates only when every column matched, including order_id, so two genuine orders from the same customer would still differ on the id or the date.",
  "I kept the very large order because the brief said to keep genuine outliers. Removing it would pull down the average of whichever group it sits in, so I'd report the promo comparison both with and without it.",
  "The region replace mapping is the fragile part: a new spelling would fall straight through. I'd upper-case and strip punctuation first, map to state codes, and flag any value that isn't in the known list.",
];

export function sampleSubmission(inst: Instance): Submission {
  const t = inst.truth;
  return {
    answers: {
      duplicates: String(t.duplicates),
      invalid_values: String(t.invalid_values),
      top_region: t.top_region,
      avg_promo: String(t.avg_promo),
      avg_no_promo: String(t.avg_no_promo),
    },
    issue_log: `Found ${t.duplicates} exact duplicate rows and removed them. ${t.invalid_values} orders had zero or negative basket values. ${t.future_dates} orders were dated after the extract date. Region had inconsistent spellings (Vic, Victoria, N.S.W.) which I standardised. Order ${inst.planted.outlier_order} is an outlier over $900 but looks genuine, so I kept it.`,
    code: [
      "import pandas as pd",
      "df = pd.read_csv('orders.csv').drop_duplicates()",
      "df = df[df.basket_value > 0]",
      "df = df[pd.to_datetime(df.order_date) <= '2026-08-31']",
      "df['region'] = df.region.replace({'Vic': 'VIC', 'Victoria': 'VIC', 'N.S.W.': 'NSW',",
      "    'New South Wales': 'NSW', 'Qld': 'QLD', 'Queensland': 'QLD'})",
      "print(df.groupby('region').basket_value.mean().idxmax())",
      "print(df.groupby(df.promo_code.notna()).basket_value.mean())",
    ].join("\n"),
    summary: `After cleaning, orders with a promo code averaged $${t.avg_promo.toFixed(2)} against $${t.avg_no_promo.toFixed(2)} without, so promos are associated with larger baskets. ${t.top_region} has the highest average basket. This is a correlation, not proof that promos cause bigger baskets, since shoppers who use codes may already spend more. A controlled test on one region would confirm it.`,
  };
}
