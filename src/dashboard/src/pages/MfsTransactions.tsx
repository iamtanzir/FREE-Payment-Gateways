import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Smartphone, Folder, CheckCircle2, Clock, CircleDot } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

const STATUS_TABS = [
  { value: "all", label: "All", icon: Folder, color: "text-blue-400" },
  { value: "approved", label: "Approved", icon: CheckCircle2, color: "text-green-400" },
  { value: "pending", label: "Pending", icon: Clock, color: "text-yellow-400" },
  { value: "used", label: "Used", icon: CircleDot, color: "text-blue-400" },
];

const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  used: "bg-blue-100 text-blue-700",
};

export default function MfsTransactions() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    if (activeBrandId) f.push({ column: "brand_id", operator: "eq", value: activeBrandId });
    if (statusFilter !== "all") f.push({ column: "status", operator: "eq", value: statusFilter });
    return f;
  }, [orgId, activeBrandId, statusFilter]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `phone_number.ilike.${s},transaction_id.ilike.${s},payment_method.ilike.${s}`;
  }, [search]);

  const { data: transactions, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["mfs_transactions", orgId, activeBrandId, statusFilter, search],
    tableName: "mfs_transactions",
    select: "*, devices(name)",
    filters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 10,
    enabled: !!orgId,
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">MFS Transactions</h1><p className="text-muted-foreground text-sm">Track mobile financial service transactions</p></div>

        <div className={`flex items-center gap-1 border-b border-border pb-3 ${isMobile ? "overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4" : "flex-wrap"}`}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); pagination.setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${statusFilter === tab.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />{tab.label}
            </button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by phone, TXN ID, method..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }} /></div></div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16"><Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No MFS transactions found.</p></div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {transactions.map((t: any) => (
                  <div key={t.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2"><Smartphone className="h-4 w-4 text-muted-foreground shrink-0" /><span className="capitalize font-medium text-sm">{t.payment_method}</span></div>
                      <Badge variant="secondary" className={statusColors[t.status] || ""}>{t.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-lg font-bold">৳{Number(t.amount).toLocaleString()}</p><p className="text-xs text-muted-foreground">Bal: ৳{Number(t.balance).toLocaleString()}</p></div>
                      <div className="text-right"><p className="text-sm">{t.phone_number}</p><p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM dd, yyyy")}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Method</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Phone</th>
                    <th className="text-left font-medium text-muted-foreground p-4">TXN ID</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Balance</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Device</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Date</th>
                  </tr></thead>
                  <tbody>
                    {transactions.map((t: any) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-muted-foreground" /><span className="capitalize font-medium">{t.payment_method}</span></div></td>
                        <td className="p-4">{t.phone_number}</td>
                        <td className="p-4 font-mono text-xs">{t.transaction_id}</td>
                        <td className="p-4 font-medium">৳{Number(t.amount).toLocaleString()}</td>
                        <td className="p-4 text-muted-foreground">৳{Number(t.balance).toLocaleString()}</td>
                        <td className="p-4"><Badge variant="secondary" className={statusColors[t.status] || ""}>{t.status}</Badge></td>
                        <td className="p-4 text-muted-foreground">{t.devices?.name || "—"}</td>
                        <td className="p-4 text-muted-foreground">{format(new Date(t.created_at), "yyyy-MM-dd")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationControls pagination={pagination} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
