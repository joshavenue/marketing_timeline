export type Freshness = "fresh" | "stale" | "frozen";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function deriveFreshness(input: {
  observedAt: Date;
  frozenAt: Date | null;
  now: Date;
  freezeAgeDays?: number;
  reportedFreshness?: Freshness;
}): Freshness {
  if (input.frozenAt) return "frozen";
  const ageMs = input.now.getTime() - input.observedAt.getTime();
  if (
    input.freezeAgeDays !== undefined &&
    ageMs >= input.freezeAgeDays * 24 * 60 * 60 * 1000
  ) {
    return "frozen";
  }
  if (input.reportedFreshness) return input.reportedFreshness;
  return ageMs > SEVEN_DAYS_MS
    ? "stale"
    : "fresh";
}
