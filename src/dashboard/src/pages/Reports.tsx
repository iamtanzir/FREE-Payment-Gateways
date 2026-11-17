import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#ec4899"];

export default function Reports() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const [period, setPeriod] = useState("30d");

  const startDate = (() => {
    const d = new Date();
    if (period === "7d") d.setDate(d.getDate() - 7);
    else if (period === "30d") d.setDate(d.getDate() - 30);
    else if (period === "90d") d.setDate(d.getDate() - 90);
    else d.setFullYear(d.getFullYear() - 10);
    return d.toISOString();
  })();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["report-transactions", orgId, activeBrandId, period],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, gateways(display_name, gateway_type, brand_id), customers(name, email)")
        .eq("organization_id", orgId!)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      let result = data || [];
      if (activeBrandId) {
        result = result.filter((t: any) => {
          const gw = t.gateways as any;
          if (!gw) return false;
          return gw.brand_id === activeBrandId;
        });
      }
      return result;
    },
    enabled: !!orgId,
  });

  const totalRevenue = transactions.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const totalPending = transactions.filter((t) => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const totalFailed = transactions.filter((t) => t.status === "failed").length;
  const successRate = transactions.length > 0
    ? ((transactions.filter((t) => t.status === "completed").length / transactions.length) * 100).toFixed(1)
    : "0";

  // Gateway breakdown
  const gatewayData = transactions.reduce((acc: any[], t) => {
    const name = t.gateways?.display_name || t.gateways?.gateway_type || "Unknown";
    const existing = acc.find((a) => a.name === name);
    if (existing) { existing.value += Number(t.amount); existing.count++; }
    else acc.push({ name, value: Number(t.amount), count: 1 });
    return acc;
  }, []);

  // Status breakdown
  const statusData = [
    { name: "Completed", value: transactions.filter((t) => t.status === "completed").length, fill: "#22c55e" },
    { name: "Pending", value: transactions.filter((t) => t.status === "pending").length, fill: "#f59e0b" },
    { name: "Failed", value: transactions.filter((t) => t.status === "failed").length, fill: "#ef4444" },
    { name: "Refunded", value: transactions.filter((t) => t.status === "refunded").length, fill: "#6366f1" },
  ].filter((d) => d.value > 0);

  // Daily chart data
  const dailyData = transactions.reduce((acc: any, t) => {
    const day = new Date(t.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
    if (!acc[day]) acc[day] = { date: day, revenue: 0, count: 0 };
    if (t.status === "completed") acc[day].revenue += Number(t.amount);
    acc[day].count++;
    return acc;
  }, {});
  const chartData = Object.values(dailyData).reverse().slice(-14);

  const exportCSV = () => {
    const headers = "Date,Customer,Amount,Currency,Status,Gateway\n";
    const rows = transactions.map((t) =>
      `${new Date(t.created_at).toLocaleDateString()},${t.customers?.name || t.customers?.email || ""},${t.amount},${t.currency},${t.status},${t.gateways?.display_name || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm">Analytics and transaction reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">৳{totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center text-green-600 text-xs mt-1"><TrendingUp className="h-3 w-3 mr-1" />{transactions.filter(t=>t.status==="completed").length} completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold mt-1">৳{totalPending.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t=>t.status==="pending").length} transactions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold mt-1">{successRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{transactions.length} total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold mt-1">{totalFailed}</p>
                  <div className="flex items-center text-red-600 text-xs mt-1"><TrendingDown className="h-3 w-3 mr-1" />transactions</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Daily Revenue</CardTitle></CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {statusData.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                        {s.name} ({s.value})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gateway breakdown */}
            {gatewayData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Gateway Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium text-muted-foreground pb-3">Gateway</th>
                          <th className="text-left font-medium text-muted-foreground pb-3">Transactions</th>
                          <th className="text-left font-medium text-muted-foreground pb-3">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gatewayData.map((g, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-3 font-medium">{g.name}</td>
                            <td className="py-3 text-muted-foreground">{g.count}</td>
                            <td className="py-3 font-medium">৳{g.value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
