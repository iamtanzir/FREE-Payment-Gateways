import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MessageSquare, Folder, CheckCircle2, Clock, XCircle, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

const STATUS_TABS = [
  { value: "all", label: "All", icon: Folder, color: "text-blue-400" },
  { value: "pending", label: "Pending", icon: Clock, color: "text-yellow-400" },
  { value: "matched", label: "Matched", icon: CheckCircle2, color: "text-green-400" },
  { value: "unmatched", label: "Unmatched", icon: XCircle, color: "text-red-400" },
];

const DEFAULT_PROVIDERS = ["bkash", "nagad", "rocket", "mcash"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  matched: "bg-green-100 text-green-700",
  unmatched: "bg-red-100 text-red-700",
  ignored: "bg-gray-100 text-gray-500",
};

export default function SmsData() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  // Realtime: auto-refresh SMS data on new inserts/updates
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`sms-data-realtime-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sms_data", filter: `organization_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sms-data", orgId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  const filters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    if (activeBrandId) f.push({ column: "brand_id", operator: "eq", value: activeBrandId });
    if (statusFilter !== "all") f.push({ column: "status", operator: "eq", value: statusFilter });
    if (providerFilter !== "all") f.push({ column: "provider", operator: "ilike", value: providerFilter });
    return f;
  }, [orgId, activeBrandId, statusFilter, providerFilter]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `sender.ilike.${s},message.ilike.${s},provider.ilike.${s}`;
  }, [search]);

  const { data: smsData, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["sms-data", orgId, activeBrandId, statusFilter, providerFilter, search],
    tableName: "sms_data",
    select: "*",
    filters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 10,
    enabled: !!orgId,
  });

  // Fetch devices to get custom providers from config
  const { data: devices = [] } = useQuery({
    queryKey: ["devices", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("config").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Build provider list (defaults + custom from all devices)
  const allProviders = useMemo(() => {
    const providers = DEFAULT_PROVIDERS.map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }));
    const seenKeys = new Set(DEFAULT_PROVIDERS);
    devices.forEach((d: any) => {
      const customs = (d.config as any)?.custom_providers;
      if (Array.isArray(customs)) {
        customs.forEach((cp: any) => {
          if (cp.key && !seenKeys.has(cp.key)) {
            seenKeys.add(cp.key);
            providers.push({ key: cp.key, label: cp.label || cp.key });
          }
        });
      }
    });
    return providers;
  }, [devices]);

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">SMS Data</h1><p className="text-muted-foreground text-sm">Monitor MFS SMS transactions</p></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Results</p><p className="text-2xl font-bold">{pagination.totalCount.toLocaleString()}</p></CardContent></Card>
        </div>

        {/* Status tabs */}
        <div className={`flex items-center gap-1 border-b border-border pb-3 ${isMobile ? "overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4" : "flex-wrap"}`}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); pagination.setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${statusFilter === tab.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />{tab.label}
            </button>
          ))}
        </div>

        {/* Provider filter chips */}
        <div className={`flex items-center gap-1.5 ${isMobile ? "overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4" : "flex-wrap"}`}>
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => { setProviderFilter("all"); pagination.setPage(1); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${providerFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            All Providers
          </button>
          {allProviders.map((p) => (
            <button
              key={p.key}
              onClick={() => { setProviderFilter(p.key); pagination.setPage(1); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${providerFilter === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search SMS..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }} /></div></div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : smsData.length === 0 ? (
              <div className="text-center py-16"><MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No SMS data found.</p></div>
            ) : (
              <div className="divide-y divide-border">
                {smsData.map((sms: any) => (
                  <div key={sms.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{sms.sender}</span>
                        {sms.provider && <Badge variant="outline" className="text-xs">{sms.provider}</Badge>}
                        <Badge variant="secondary" className={`text-xs ${statusColors[sms.status] || ""}`}>{sms.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{sms.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {sms.amount && <span className="font-medium text-foreground">৳{Number(sms.amount).toLocaleString()}</span>}
                        {sms.transaction_id && <span>TxID: {sms.transaction_id}</span>}
                        <span>{new Date(sms.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <PaginationControls pagination={pagination} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
