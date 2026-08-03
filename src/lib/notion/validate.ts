import {
  canonicalPageSchema,
  normalizeCanonicalPage,
  type CanonicalRecord,
} from "@/lib/notion/canonical";

export type ValidationResult<T> =
  | { status: "valid"; record: T }
  | { status: "skipped"; reason: string }
  | { status: "invalid"; errors: string[] };

function invalidDateRange(input: Record<string, unknown>) {
  const start =
    typeof input.startDate === "string"
      ? input.startDate
      : typeof input.periodStart === "string"
        ? input.periodStart
        : null;
  const end =
    typeof input.endDate === "string"
      ? input.endDate
      : typeof input.periodEnd === "string"
        ? input.periodEnd
        : null;
  return Boolean(start && end && end < start);
}

export function validateCanonicalPage(
  input: unknown,
): ValidationResult<CanonicalRecord> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { status: "invalid", errors: ["record must be an object"] };
  }

  const raw = input as Record<string, unknown>;
  if (
    raw.publicationStatus === "Draft" ||
    raw.publicationStatus === "Ready for Review"
  ) {
    return {
      status: "skipped",
      reason: `Publication Status is ${raw.publicationStatus}`,
    };
  }

  const parsed = canonicalPageSchema.safeParse(input);
  const errors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => {
        const path = issue.path.join(".") || "record";
        return `${path}: ${issue.message}`;
      });

  if (invalidDateRange(raw)) {
    errors.push("date range: end must not precede start");
  }

  if (errors.length > 0 || !parsed.success) {
    return { status: "invalid", errors };
  }

  return {
    status: "valid",
    record: normalizeCanonicalPage(parsed.data),
  };
}
