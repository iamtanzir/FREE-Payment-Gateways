import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, FileText, Eye, Trash2, ChevronDown, Send, CheckCircle2, Folder, Clock, XCircle, AlertTriangle, CircleDot } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

const STATUS_TABS = [
  { value: "all", label: "All", icon: Folder, color: "text-blue-400" },
  { value: "draft", label: "Draft", icon: CircleDot, color: "text-gray-400" },
  { value: "sent", label: "Sent", icon: Send, color: "text-blue-400" },
  { value: "paid", label: "Paid", icon: CheckCircle2, color: "text-green-400" },
  { value: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-400" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "text-gray-500" },
];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function Invoices() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState("");

  const invoiceFilters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    if (activeBrandId) f.push({ column: "brand_id", operator: "eq", value: activeBrandId });
    if (statusFilter !== "all") f.push({ column: "status", operator: "eq", value: statusFilter });
    return f;
  }, [orgId, activeBrandId, statusFilter]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `invoice_number.ilike.${s}`;
  }, [search]);

  const { data: invoices, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["invoices", orgId, activeBrandId, statusFilter, search],
    tableName: "invoices",
    select: "*, customers(name, email)",
    filters: invoiceFilters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 10,
    enabled: !!orgId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, email").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").insert({
        organization_id: orgId!,
        brand_id: activeBrandId || null,
        invoice_number: invoiceNumber.trim() || `INV-${Date.now()}`,
        amount: parseFloat(amount), currency,
        due_date: dueDate || null, notes: notes.trim() || null,
        customer_id: customerId || null, status: "draft" as const, items: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice created!");
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      setDialogOpen(false); resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "paid") updateData.paid_at = new Date().toISOString();
      const { error } = await supabase.from("invoices").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated!"); queryClient.invalidateQueries({ queryKey: ["invoices", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Invoice deleted!"); queryClient.invalidateQueries({ queryKey: ["invoices", orgId] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setInvoiceNumber(""); setAmount(""); setCurrency("BDT"); setDueDate(""); setNotes(""); setCustomerId(""); };

  const ActionsDropdown = ({ inv }: { inv: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1"><ChevronDown className="h-3 w-3" /> Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewInvoice(inv)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
        {inv.status === "draft" && <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "sent" })}><Send className="mr-2 h-4 w-4" /> Send</DropdownMenuItem>}
        {inv.status === "sent" && <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "paid" })} className="text-green-600"><CheckCircle2 className="mr-2 h-4 w-4" /> Mark Paid</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => setDeleteId(inv.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground text-sm">Create and manage invoices</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Invoice</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Invoice Number</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001 (auto)" /></div>
                  <div className="space-y-2"><Label>Customer</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount *</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="BDT">BDT</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !amount}>{createMutation.isPending ? "Creating..." : "Create Invoice"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
            <div className="p-3 md:p-4 border-b border-border">
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }} /></div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-16"><FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices found.</p></div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.customers?.name || inv.customers?.email || "—"}</p>
                      </div>
                      <Badge variant="secondary" className={statusColors[inv.status] || ""}>{inv.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">{inv.currency} {Number(inv.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="flex items-center justify-end"><ActionsDropdown inv={inv} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Invoice</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Due Date</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{inv.invoice_number}</span></div></td>
                        <td className="p-4 text-muted-foreground">{inv.customers?.name || inv.customers?.email || "—"}</td>
                        <td className="p-4 font-medium">{inv.currency} {Number(inv.amount).toLocaleString()}</td>
                        <td className="p-4"><Badge variant="secondary" className={statusColors[inv.status] || ""}>{inv.status}</Badge></td>
                        <td className="p-4 text-muted-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                        <td className="p-4 text-right"><ActionsDropdown inv={inv} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationControls pagination={pagination} />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
            {viewInvoice && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Invoice #:</span> <strong>{viewInvoice.invoice_number}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className={statusColors[viewInvoice.status]}>{viewInvoice.status}</Badge></div>
                  <div><span className="text-muted-foreground">Amount:</span> <strong>{viewInvoice.currency} {Number(viewInvoice.amount).toLocaleString()}</strong></div>
                  <div><span className="text-muted-foreground">Due:</span> {viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString() : "—"}</div>
                  <div><span className="text-muted-foreground">Customer:</span> {viewInvoice.customers?.name || viewInvoice.customers?.email || "—"}</div>
                  <div><span className="text-muted-foreground">Created:</span> {new Date(viewInvoice.created_at).toLocaleDateString()}</div>
                </div>
                {viewInvoice.notes && <div><span className="text-muted-foreground">Notes:</span><p className="mt-1">{viewInvoice.notes}</p></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Invoice?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}