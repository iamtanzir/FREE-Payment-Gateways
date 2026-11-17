import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2 } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { PaymentStatisticsChart } from "@/components/dashboard/PaymentStatisticsChart";
import { GatewayPieChart } from "@/components/dashboard/GatewayPieChart";
import { DeviceStatusWidget } from "@/components/dashboard/DeviceStatusWidget";
import { LatestPaymentsTable } from "@/components/dashboard/LatestPaymentsTable";

export default function Dashboard() {
  const {
    isLoading,
    filtered,
    totalPayments,
    pendingPayments,
    failedPayments,
    pendingSmsCount,
    makeSparkline,
    chartData,
    range,
    setRange,
    gatewayData,
    gwRange,
    setGwRange,
    devices,
    latestPayments,
  } = useDashboardData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        <DashboardMetrics
          totalPayments={totalPayments}
          pendingPayments={pendingPayments}
          failedPayments={failedPayments}
          pendingSmsCount={pendingSmsCount}
          makeSparkline={makeSparkline}
          filtered={filtered}
        />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <PaymentStatisticsChart chartData={chartData} range={range} setRange={setRange} />
          <GatewayPieChart gatewayData={gatewayData} gwRange={gwRange} setGwRange={setGwRange} />
        </div>

        <DeviceStatusWidget devices={devices} />

        <LatestPaymentsTable payments={latestPayments} />
      </div>
    </DashboardLayout>
  );
}
