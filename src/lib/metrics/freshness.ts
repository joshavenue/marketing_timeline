export type Freshness = "fresh" | "stale" | "frozen";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function deriveFreshness(input: {
  observedAt: Date;
  frozenAt: Date | null;
  now: Date;
}): Freshness {
  if (input.frozenAt) return "frozen";
  return input.now.getTime() - input.observedAt.getTime() > SEVEN_DAYS_MS
    ? "stale"
    : "fresh";
}
