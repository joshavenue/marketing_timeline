function required(inputs: Record<string, number>, key: string) {
  const value = inputs[key];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export function calculateMetric(
  formulaKey: string,
  inputs: Record<string, number>,
): number {
  switch (formulaKey) {
    case "budget_variance":
      return required(inputs, "actual") - required(inputs, "planned");
    case "engagement_rate": {
      const impressions = required(inputs, "impressions");
      if (impressions <= 0) throw new Error("impressions must be greater than zero");
      return required(inputs, "engagements") / impressions;
    }
    case "cost_per_result": {
      const results = required(inputs, "results");
      if (results <= 0) throw new Error("results must be greater than zero");
      return required(inputs, "cost") / results;
    }
    default:
      throw new Error(`Unsupported formula: ${formulaKey}`);
  }
}
