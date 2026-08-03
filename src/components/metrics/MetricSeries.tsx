import { MetricCard } from "@/components/metrics/MetricCard";

type Metric = Parameters<typeof MetricCard>[0]["metric"];

export function MetricSeries({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-black/15 p-5 text-sm text-black/45">
        No published metrics are linked to this initiative yet.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {metrics.map((metric, index) => (
        <MetricCard key={`${metric.name}-${index}`} metric={metric} />
      ))}
    </div>
  );
}
