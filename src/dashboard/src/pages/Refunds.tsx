import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Folder, Clock, CheckCircle2, XCircle, RotateCcw, Eye } from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

const STATUS_TABS = [
  { value: "all", label: "All", icon: Folder, color: "text-blue-400" },
  { value: "pending", label: "Pending", icon: Clock, color: "text-yellow-400" },
  { value: "approved", label: "Approved", icon: CheckCircle2, color: "text-green-400" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "text-red-400" },
];

export default function Refunds() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [txId, setTxId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["refunds", orgId, activeBrandId],
    queryFn: async () => {
      const { data } = await supabase.from("refunds").select("*, transactions(amount, currency, reference, gateways(brand_id))").eq("organization_id", orgId!).order("created_at", { ascending: false });
      let result = data || [];
      if (activeBrandId) {
        result = result.filter((r: any) => {
          const gw = (r.transactions as any)?.gateways as any;
          if (!gw) return false;
          return gw.brand_id === activeBrandId;
        });
      }
      return result;
    },
    enabled: !!orgId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-for-refund", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("id, amount, currency, reference, status").eq("organization_id", orgId!).eq("status", "completed").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!orgId && dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("refunds").insert({ organization_id: orgId!, transaction_id: txId, amount: parseFloat(amount), reason: reason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Refund request created!");
      queryClient.invalidateQueries({ queryKey: ["refunds", orgId] });
      setDialogOpen(false); setTxId(""); setAmount(""); setReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("refunds").update({ status: status as any, processed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Refund status updated!"); queryClient.invalidateQueries({ queryKey: ["refunds", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return refunds.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.id.includes(s) || r.transaction_id.includes(s) || r.reason?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [refunds, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: refunds.length };
    refunds.forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [refunds]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const ActionsDropdown = ({ r }: { r: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1"><ChevronDown className="h-3 w-3" /> Actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {r.status === "pending" && <>
          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: r.id, status: "approved" })} className="text-green-600"><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: r.id, status: "rejected" })} className="text-destructive"><XCircle className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">Refunds</h1><p className="text-muted-foreground text-sm">Manage payment refund requests</p></div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New Refund</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Refund Request</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Transaction *</Label>
                  <Select value={txId} onValueChange={(val) => { setTxId(val); const tx = transactions.find((t) => t.id === val); if (tx) setAmount(String(tx.amount)); }}>
                    <SelectTrigger><SelectValue placeholder="Select transaction" /></SelectTrigger>
                    <SelectContent>{transactions.map((t) => <SelectItem key={t.id} value={t.id}>{t.reference || t.id.slice(0, 12)} — {Number(t.amount).toFixed(2)} {t.currency || "USD"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Refund Amount *</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !txId}>{createMutation.isPending ? "Creating..." : "Create Refund"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className={`flex items-center gap-1 border-b border-border pb-3 ${isMobile ? "overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4" : "flex-wrap"}`}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${statusFilter === tab.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />{tab.label}
              {statusCounts[tab.value] ? <span className="text-xs opacity-70">({statusCounts[tab.value]})</span> : null}
            </button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search refunds..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} /></div></div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16"><RotateCcw className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No refunds found.</p></div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {paginated.map((r: any) => (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="font-mono text-xs truncate">{r.id.slice(0, 16)}</p><p className="text-xs text-muted-foreground truncate">{r.reason || "No reason"}</p></div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">{Number(r.amount).toFixed(2)} {(r.transactions as any)?.currency || "USD"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM dd, yyyy")}</p>
                    </div>
                    {r.status === "pending" && <div className="flex justify-end"><ActionsDropdown r={r} /></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Refund ID</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Reason</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Date</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {paginated.map((r: any) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-mono text-xs">{r.id.slice(0, 12)}</td>
                        <td className="p-4 font-semibold">{Number(r.amount).toFixed(2)} {(r.transactions as any)?.currency || "USD"}</td>
                        <td className="p-4"><StatusBadge status={r.status} /></td>
                        <td className="p-4 text-muted-foreground max-w-[200px] truncate">{r.reason || "—"}</td>
                        <td className="p-4 text-muted-foreground">{format(new Date(r.created_at), "yyyy-MM-dd")}</td>
                        <td className="p-4 text-right">{r.status === "pending" ? <ActionsDropdown r={r} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{filtered.length} results</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  {!isMobile && (() => {
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, start + 4);
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                      <Button key={p} variant={currentPage === p ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p)}>{p}</Button>
                    ));
                  })()}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}