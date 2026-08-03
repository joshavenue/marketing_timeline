import type { GrowthSeriesReadModel } from "@/lib/metrics/growth-series";

function day(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  return date.getTime() / 86_400_000;
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return "No reading";
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

export function GrowthChart({
  series,
  start,
  end,
}: {
  series: GrowthSeriesReadModel;
  start: string;
  end: string;
}) {
  const width = 1000;
  const height = 150;
  const chartTop = 18;
  const chartBottom = 118;
  const startDay = day(start);
  const totalDays = Math.max(1, day(end) - startDay);
  const values = series.points.map((point) => point.numericValue);
  const target = series.definition.target === null
    ? null
    : Number(series.definition.target);
  const scaleValues = target === null ? values : [...values, target];
  const minimum = scaleValues.length ? Math.min(...scaleValues) : 0;
  const maximum = scaleValues.length ? Math.max(...scaleValues) : 1;
  const range = Math.max(1, maximum - minimum);
  const position = (point: GrowthSeriesReadModel["points"][number]) => ({
    x: Math.min(
      width,
      Math.max(0, ((day(point.periodStart) - startDay) / totalDays) * width),
    ),
    y:
      chartBottom -
      ((point.numericValue - minimum) / range) * (chartBottom - chartTop),
  });
  const positioned = series.points.map((point) => ({
    point,
    ...position(point),
  }));
  const targetY =
    target === null
      ? null
      : chartBottom - ((target - minimum) / range) * (chartBottom - chartTop);
  const hasGap = series.points.some((point) => point.hasGapBefore);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            {series.definition.name}
          </p>
          <p className="mt-1 text-3xl font-semibold text-[var(--color-ocean)]">
            {formatValue(series.latestValue, series.definition.unit)}
          </p>
          {series.changePercent === null ? null : (
            <p className="mt-1 text-sm font-semibold text-[var(--color-success)]">
              {series.changePercent >= 0 ? "+" : ""}
              {series.changePercent.toFixed(1)}% in view
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-5 text-xs text-[var(--color-muted)]">
          <span>
            <span className="mr-1 text-[var(--color-evidence)]">●</span>
            {series.definition.kind === "raw"
              ? "Raw observation"
              : "Calculated observation"}
          </span>
          <span>
            <span className="mr-1 text-[var(--color-ocean)]">— —</span>
            Comparison context
          </span>
          <span>Frozen after {series.freezeAgeDays} days</span>
        </div>
      </div>
      <svg
        aria-label={`${series.definition.name} across the selected timeline`}
        className="mt-3 h-40 w-full overflow-visible px-5"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[chartTop, (chartTop + chartBottom) / 2, chartBottom].map((y) => (
          <line
            key={y}
            stroke="var(--color-fog)"
            strokeWidth="1"
            x1="0"
            x2={width}
            y1={y}
            y2={y}
          />
        ))}
        {targetY === null ? null : (
          <line
            stroke="var(--color-ocean)"
            strokeDasharray="8 8"
            strokeWidth="1.5"
            x1="0"
            x2={width}
            y1={targetY}
            y2={targetY}
          />
        )}
        {positioned.slice(1).map((current, index) => {
          const previous = positioned[index]!;
          return current.point.hasGapBefore ? null : (
            <line
              key={`${previous.point.id}-${current.point.id}`}
              stroke="var(--color-evidence)"
              strokeWidth="3"
              x1={previous.x}
              x2={current.x}
              y1={previous.y}
              y2={current.y}
            />
          );
        })}
        {positioned.map(({ point, x, y }) => (
          <a href={point.sourceUrl} key={point.id} target="_blank">
            <circle
              aria-label={`${point.numericValue} ${series.definition.unit}`}
              cx={x}
              cy={y}
              fill="white"
              r="5"
              stroke="var(--color-evidence)"
              strokeWidth="3"
            />
          </a>
        ))}
      </svg>
      {hasGap ? (
        <p className="-mt-8 px-5 text-center text-xs text-[var(--color-muted)]">
          No recorded value
        </p>
      ) : null}
    </div>
  );
}
