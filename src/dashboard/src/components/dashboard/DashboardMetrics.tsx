import { MetricCard } from "@/components/MetricCard";

interface DashboardMetricsProps {
  totalPayments: number;
  pendingPayments: number;
  failedPayments: number;
  pendingSmsCount: number;
  makeSparkline: (items: any[]) => number[];
  filtered: any[];
}

export function DashboardMetrics({
  totalPayments,
  pendingPayments,
  failedPayments,
  pendingSmsCount,
  makeSparkline,
  filtered,
}: DashboardMetricsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Total Payments" value={totalPayments} color="hsl(217, 91%, 60%)" sparklineData={makeSparkline(filtered)} />
      <MetricCard title="Pending Payments" value={pendingPayments} color="hsl(0, 84%, 60%)" sparklineData={makeSparkline(filtered.filter((t) => t.status === "pending"))} />
      <MetricCard title="Unpaid Invoices" value={failedPayments} color="hsl(38, 92%, 50%)" sparklineData={makeSparkline(filtered.filter((t) => t.status === "failed"))} />
      <MetricCard title="Pending SMS Data" value={pendingSmsCount} color="hsl(142, 71%, 45%)" sparklineData={[0, 0, 0, 0, 0, 0, 0]} />
    </div>
  );
}
