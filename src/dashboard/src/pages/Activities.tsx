import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Activity, User, CreditCard, FileText, Settings, Key, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

const entityIcons: Record<string, any> = { transaction: CreditCard, invoice: FileText, gateway: Settings, customer: User, api_key: Key };
const actionColors: Record<string, string> = { create: "bg-green-100 text-green-700", update: "bg-blue-100 text-blue-700", delete: "bg-red-100 text-red-700", login: "bg-purple-100 text-purple-700", export: "bg-yellow-100 text-yellow-700" };

export default function Activities() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const filters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    if (filterAction !== "all") f.push({ column: "action", operator: "eq", value: filterAction });
    return f;
  }, [orgId, filterAction]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `action.ilike.${s},entity_type.ilike.${s}`;
  }, [search]);

  const { data: activities, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["activity-logs", orgId, activeBrandId, filterAction, search],
    tableName: "activity_logs",
    select: "*",
    filters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 20,
    enabled: !!orgId,
  });

  const exportCSV = async () => {
    const { data } = await supabase.from("activity_logs").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(1000);
    if (!data) return;
    const headers = "Date,Action,Entity,Details\n";
    const rows = data.map((a: any) => `${new Date(a.created_at).toLocaleString()},${a.action},${a.entity_type},"${JSON.stringify(a.details || {})}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = "activity-logs.csv"; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">Activities</h1><p className="text-muted-foreground text-sm">System activity logs and audit trail</p></div>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className={`p-3 md:p-4 border-b border-border ${isMobile ? "space-y-2" : "flex gap-3"}`}>
              <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search activities..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }} /></div>
              <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); pagination.setPage(1); }}>
                <SelectTrigger className={isMobile ? "w-full" : "w-[140px]"}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : activities.length === 0 ? (
              <div className="text-center py-16"><Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No activity logs found.</p></div>
            ) : (
              <div className="divide-y divide-border">
                {activities.map((log: any) => {
                  const Icon = entityIcons[log.entity_type] || Activity;
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 md:p-4 hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={`text-xs ${actionColors[log.action] || ""}`}>{log.action}</Badge>
                          <span className="text-sm font-medium capitalize">{log.entity_type.replace("_", " ")}</span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && <p className="text-xs text-muted-foreground mt-1 truncate">{JSON.stringify(log.details)}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <PaginationControls pagination={pagination} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
