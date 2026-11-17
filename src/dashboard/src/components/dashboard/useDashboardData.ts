import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { subDays, format } from "date-fns";
import { useState, useMemo } from "react";
import { FilterRange } from "./PaymentStatisticsChart";

const gatewayColors: Record<string, string> = {
  stripe: "hsl(249, 53%, 58%)",
  paypal: "hsl(217, 91%, 60%)",
  bkash: "hsl(340, 82%, 52%)",
  nagad: "hsl(25, 95%, 53%)",
  razorpay: "hsl(280, 60%, 55%)",
  bank_transfer: "hsl(200, 50%, 50%)",
  crypto: "hsl(45, 80%, 50%)",
};

export function useDashboardData() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const [range, setRange] = useState<FilterRange>("30d");
  const [gwRange, setGwRange] = useState<FilterRange>("30d");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", orgId, activeBrandId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, customers(name, email), gateways(display_name, gateway_type, brand_id)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      let result = data || [];
      if (activeBrandId) {
        result = result.filter((t: any) => {
          const gw = t.gateways as any;
          if (!gw) return false; // strict brand isolation
          return gw.brand_id === activeBrandId;
        });
      }
      return result;
    },
    enabled: !!orgId,
  });

  const { data: pendingSmsCount = 0 } = useQuery({
    queryKey: ["pending-sms", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("sms_data")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!orgId,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["dashboard-devices", orgId, activeBrandId],
    queryFn: async () => {
      let q = supabase
        .from("devices")
        .select("id, name, status, is_active, last_seen_at, phone_number, brand_id, device_brand, device_model")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (activeBrandId) q = q.eq("brand_id", activeBrandId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const now = new Date();

  const rangeStart = range === "all" ? null : subDays(now, range === "7d" ? 7 : range === "30d" ? 30 : 90);
  const filtered = rangeStart
    ? transactions.filter((t) => new Date(t.created_at) >= rangeStart)
    : transactions;

  const totalPayments = filtered.length;
  const pendingPayments = filtered.filter((t) => t.status === "pending").length;
  const failedPayments = filtered.filter((t) => t.status === "failed").length;

  const makeSparkline = (items: typeof filtered) => {
    const days = 7;
    const counts = Array(days).fill(0);
    items.forEach((t) => {
      const diff = Math.floor((now.getTime() - new Date(t.created_at).getTime()) / 86400000);
      if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
    });
    return counts;
  };

  const chartDays = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 60;
  const chartData = Array.from({ length: chartDays }, (_, i) => {
    const d = subDays(now, chartDays - 1 - i);
    const label = chartDays <= 7
      ? format(d, "h a")
      : chartDays <= 30
      ? format(d, "d MMM")
      : format(d, "MMM d");
    const dayTxns = transactions.filter((t) => new Date(t.created_at).toDateString() === d.toDateString());
    return {
      name: label,
      allPayments: dayTxns.length,
      successful: dayTxns.filter((t) => t.status === "completed").length,
      pending: dayTxns.filter((t) => t.status === "pending").length,
      income: dayTxns.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const gwStart = gwRange === "all" ? null : subDays(now, gwRange === "7d" ? 7 : gwRange === "30d" ? 30 : 90);
  const gwFiltered = gwStart
    ? transactions.filter((t) => new Date(t.created_at) >= gwStart)
    : transactions;

  const gwMap: Record<string, { count: number; name: string }> = {};
  gwFiltered.forEach((t) => {
    const gw = t.gateways as any;
    const type = gw?.gateway_type || "other";
    const displayName = gw?.display_name || type;
    if (!gwMap[type]) gwMap[type] = { count: 0, name: displayName };
    gwMap[type].count++;
  });
  const gatewayData = Object.entries(gwMap).map(([type, { count, name }]) => ({
    name,
    value: count,
    color: gatewayColors[type] || "hsl(220, 10%, 70%)",
  }));

  const latestPayments = transactions.slice(0, 10);

  return {
    isLoading,
    transactions,
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
  };
}
