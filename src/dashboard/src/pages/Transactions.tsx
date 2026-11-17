import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter, Loader2, ChevronDown, ChevronLeft, ChevronRight, Eye, RotateCw, Send, Trash2, Square, Copy, ExternalLink, Pencil, CheckCircle, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

export default function Transactions() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const { user } = useAuth();
  const orgId = currentOrg?.id;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterUntil, setFilterUntil] = useState("");
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Approve modal state
  const [approveTransaction, setApproveTransaction] = useState<any>(null);
  const [approveSender, setApproveSender] = useState("");
  const [approveTrxId, setApproveTrxId] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);

  // Build filters for server-side pagination
  const filters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    const activeStatus = filterStatus || (statusFilter !== "all" ? statusFilter : "");
    if (activeStatus) f.push({ column: "status", operator: "eq", value: activeStatus });
    if (filterFrom) f.push({ column: "created_at", operator: "gte", value: filterFrom });
    if (filterUntil) f.push({ column: "created_at", operator: "lte", value: filterUntil + "T23:59:59" });
    if (activeBrandId) f.push({ column: "gateways.brand_id", operator: "eq", value: activeBrandId });
    return f;
  }, [orgId, statusFilter, filterStatus, filterFrom, filterUntil, activeBrandId]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `reference.ilike.${s},customers.email.ilike.${s},customers.name.ilike.${s},id.ilike.${s}`;
  }, [search]);

  const { data: paginated, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["transactions-list", orgId, activeBrandId, statusFilter, filterStatus, filterFrom, filterUntil, search],
    tableName: "transactions",
    select: "*, customers(name, email, phone), gateways(display_name, gateway_type, percent_charge, fixed_charge, image_url, brand_id)",
    filters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 10,
    enabled: !!orgId,
  });

  const toggleSelectAll = () => {
    setSelectedRows(selectedRows.length === paginated.length ? [] : paginated.map(tx => tx.id));
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const calcNetAmount = (tx: any) => {
    const amount = Number(tx.amount);
    const gw = tx.gateways as any;
    if (!gw) return amount;
    return amount - (amount * Number(gw.percent_charge || 0) / 100) - Number(gw.fixed_charge || 0);
  };

  const resetFilter = () => {
    setFilterStatus("");
    setFilterFrom("");
    setFilterUntil("");
    setShowFilter(false);
  };

  const handleSendIPN = async (tx: any) => {
    const webhookUrl = (tx.metadata as any)?.webhook_url;
    if (!webhookUrl) {
      toast.error("No webhook URL configured for this transaction");
      return;
    }
    try {
      const payload = {
        event: `payment.${tx.status}`,
        ref: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        sender_number: (tx.metadata as any)?.sender_number || null,
        trx_id: (tx.metadata as any)?.trx_id || null,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.from("webhook_logs").insert({
        organization_id: orgId!,
        event_type: payload.event,
        url: webhookUrl,
        payload,
      });

      if (error) throw error;

      await supabase.functions.invoke("webhook-delivery", {
        body: { url: webhookUrl, payload },
      });

      toast.success("IPN notification sent");
    } catch (err) {
      console.error("Send IPN error:", err);
      toast.error("Failed to send IPN");
    }
  };

  const handleRefund = (tx: any) => {
    if (tx.status !== "completed") {
      toast.error("Only completed transactions can be refunded");
      return;
    }
    navigate("/refunds", { state: { transactionId: tx.id, transactionRef: tx.reference, amount: tx.amount, currency: tx.currency } });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleEditStatus = async () => {
    if (!editTransaction || !editStatus) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: editStatus as any })
        .eq("id", editTransaction.id);
      if (error) throw error;
      toast.success(`Status updated to ${editStatus}`);
      queryClient.invalidateQueries({ queryKey: ["transactions-list"] });
      if (orgId && user?.id) {
        logActivity({ action: "update", entityType: "transaction", entityId: editTransaction.id, orgId, userId: user.id, brandId: activeBrandId, details: { status: editStatus } });
      }
      setEditTransaction(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setEditLoading(false);
    }
  };

  const openEditDialog = (tx: any) => {
    setEditTransaction(tx);
    setEditStatus(tx.status);
  };

  const openApproveDialog = (tx: any) => {
    setApproveTransaction(tx);
    const meta = tx.metadata as any || {};
    setApproveSender(meta.sender_number || "");
    setApproveTrxId(meta.trx_id || "");
  };

  const handleApprove = async () => {
    if (!approveTransaction) return;
    setApproveLoading(true);
    try {
      const existingMeta = (approveTransaction.metadata as any) || {};
      const updatedMeta = {
        ...existingMeta,
        sender_number: approveSender || existingMeta.sender_number || null,
        trx_id: approveTrxId || existingMeta.trx_id || null,
        approved_at: new Date().toISOString(),
        source: existingMeta.source || "manual",
      };

      const { error } = await supabase
        .from("transactions")
        .update({ status: "completed" as any, metadata: updatedMeta })
        .eq("id", approveTransaction.id);
      if (error) throw error;

      // Send webhook if configured
      const webhookUrl = existingMeta.webhook_url;
      if (webhookUrl) {
        const payload = {
          event: "payment.completed",
          ref: approveTransaction.reference,
          amount: approveTransaction.amount,
          currency: approveTransaction.currency,
          status: "completed",
          sender_number: approveSender || null,
          trx_id: approveTrxId || null,
          timestamp: new Date().toISOString(),
        };

        await supabase.from("webhook_logs").insert({
          organization_id: orgId!,
          event_type: payload.event,
          url: webhookUrl,
          payload,
        });

        await supabase.functions.invoke("webhook-delivery", {
          body: { url: webhookUrl, payload },
        });
      }

      toast.success("Transaction approved successfully");
      queryClient.invalidateQueries({ queryKey: ["transactions-list"] });
      if (orgId && user?.id) {
        const gwBrandId = (approveTransaction.gateways as any)?.brand_id || activeBrandId;
        logActivity({ action: "update", entityType: "transaction", entityId: approveTransaction.id, orgId, userId: user.id, brandId: gwBrandId, details: { status: "completed", approved: true } });
      }
      setApproveTransaction(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve transaction");
    } finally {
      setApproveLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Transactions</p>
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
      </div>

      {/* Centered Status Pill Tabs */}
      <div className="flex justify-center mb-4">
        <Card className="p-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); pagination.setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        {/* Filter Toggle */}
        <div className="border-b border-border">
          {showFilter && (
            <div className="p-4">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold text-foreground">Filters</h3>
                <button className="text-sm text-destructive cursor-pointer" onClick={resetFilter}>Reset</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Created From</label>
                  <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Created Until</label>
                  <Input type="date" value={filterUntil} onChange={(e) => setFilterUntil(e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end items-center h-[53px] px-5">
            <Filter
              className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setShowFilter(!showFilter)}
            />
          </div>
        </div>

        {/* Show entries + Search + Bulk action */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Show
              <Input
                className="w-16 h-8"
                type="number"
                value={pagination.perPage}
                onChange={(e) => { pagination.setPerPage(Number(e.target.value) || 10); }}
              />
              entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Search:</span>
              <Input
                className="w-40 h-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }}
              />
              {selectedRows.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-1">
                  <Square className="h-4 w-4" /> ({selectedRows.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No transactions found.</div>
        ) : isMobile ? (
          /* Mobile Card Layout */
          <div className="divide-y divide-border">
            {paginated.map((tx) => {
              const meta = tx.metadata as any;
              return (
                <div key={tx.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {(tx.customers as any)?.email || (tx.customers as any)?.name || "—"}
                      </span>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{(tx.gateways as any)?.display_name || "—"}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(tx.amount, tx.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{tx.reference || tx.id.slice(0, 10).toUpperCase()}</span>
                    <span className="text-muted-foreground">{format(new Date(tx.created_at), "MMM dd, hh:mm a")}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setViewTransaction(tx)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <ChevronDown className="h-3 w-3" /> More
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {tx.status === "pending" && (
                          <DropdownMenuItem onClick={() => openApproveDialog(tx)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openEditDialog(tx)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRefund(tx)}>
                          <RotateCw className="mr-2 h-4 w-4" /> Refund
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendIPN(tx)}>
                          <Send className="mr-2 h-4 w-4" /> Send IPN
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => toast.info("Delete is restricted for data safety")}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table Layout — Column order: Checkbox | Ref | Customer | Amount | Gateway | Sender | TrxID | Status | Date | Actions */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border h-[46px]">
                  <th className="text-left font-medium text-muted-foreground px-4 w-10">
                    <Checkbox
                      checked={selectedRows.length === paginated.length && paginated.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4">Ref</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Customer</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Amount</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Gateway</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Sender</th>
                  <th className="text-left font-medium text-muted-foreground px-4">TrxID</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Status</th>
                  <th className="text-left font-medium text-muted-foreground px-4">Date</th>
                  <th className="px-4"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx) => {
                  const meta = (tx.metadata as any) || {};
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/50 h-[66px]">
                      <td className="px-4">
                        <Checkbox checked={selectedRows.includes(tx.id)} onCheckedChange={() => toggleRow(tx.id)} />
                      </td>
                      <td className="px-4 font-mono text-xs">{tx.reference || tx.id.slice(0, 10).toUpperCase()}</td>
                      <td className="px-4">{(tx.customers as any)?.email || (tx.customers as any)?.name || "—"}</td>
                      <td className="px-4 font-medium">{formatCurrency(tx.amount, tx.currency)}</td>
                      <td className="px-4 text-muted-foreground">{(tx.gateways as any)?.display_name || "—"}</td>
                      <td className="px-4 text-muted-foreground">{meta.sender_number || "—"}</td>
                      <td className="px-4 font-mono text-xs">{meta.trx_id || "—"}</td>
                      <td className="px-4"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 text-muted-foreground whitespace-nowrap">{format(new Date(tx.created_at), "yyyy-MM-dd hh:mm a")}</td>
                      <td className="px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <ChevronDown className="h-3 w-3" /> Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTransaction(tx)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {tx.status === "pending" && (
                              <DropdownMenuItem onClick={() => openApproveDialog(tx)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(tx)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRefund(tx)}>
                              <RotateCw className="mr-2 h-4 w-4" /> Refund
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendIPN(tx)}>
                              <Send className="mr-2 h-4 w-4" /> Send IPN
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => toast.info("Delete is restricted for data safety")}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: entries info + pagination */}
        <PaginationControls pagination={pagination} />
      </Card>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Full details for this transaction</DialogDescription>
          </DialogHeader>
          {viewTransaction && (() => {
            const meta = viewTransaction.metadata as any || {};
            const customer = viewTransaction.customers as any;
            const gateway = viewTransaction.gateways as any;
            return (
              <div className="space-y-4 text-sm">
                {/* Status banner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={viewTransaction.status} />
                </div>

                {/* Transaction Info */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Transaction Info</h4>
                  <div className="grid grid-cols-[140px_1fr] gap-y-2">
                    <span className="text-muted-foreground">Reference</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{viewTransaction.reference || "—"}</span>
                      {viewTransaction.reference && (
                        <button onClick={() => copyToClipboard(viewTransaction.reference)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{formatCurrency(viewTransaction.amount, viewTransaction.currency)}</span>
                    <span className="text-muted-foreground">Net Amount</span>
                    <span className="font-semibold">{formatCurrency(calcNetAmount(viewTransaction), viewTransaction.currency)}</span>
                    <span className="text-muted-foreground">Currency</span>
                    <span>{viewTransaction.currency}</span>
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(viewTransaction.created_at), "yyyy-MM-dd hh:mm:ss a")}</span>
                  </div>
                </div>

                {/* Customer Info */}
                {customer && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer</h4>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2">
                      {customer.name && (
                        <>
                          <span className="text-muted-foreground">Name</span>
                          <span>{customer.name}</span>
                        </>
                      )}
                      {customer.email && (
                        <>
                          <span className="text-muted-foreground">Email</span>
                          <span>{customer.email}</span>
                        </>
                      )}
                      {customer.phone && (
                        <>
                          <span className="text-muted-foreground">Phone</span>
                          <span>{customer.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Gateway Info */}
                {gateway && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Gateway</h4>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2">
                      <span className="text-muted-foreground">Gateway</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const logoUrl = gateway.image_url || (gateway.gateway_type);
                          return logoUrl ? <img src={logoUrl} alt="" className="h-5 object-contain" loading="lazy" /> : null;
                        })()}
                        <span>{gateway.display_name}</span>
                      </div>
                      <span className="text-muted-foreground">Type</span>
                      <span className="capitalize">{gateway.gateway_type}</span>
                    </div>
                  </div>
                )}

                {/* Payment Metadata */}
                {(meta.sender_number || meta.trx_id || meta.source) && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Payment Details</h4>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2">
                      {meta.sender_number && (
                        <>
                          <span className="text-muted-foreground">Sender Number</span>
                          <span>{meta.sender_number}</span>
                        </>
                      )}
                      {meta.trx_id && (
                        <>
                          <span className="text-muted-foreground">TrxID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{meta.trx_id}</span>
                            <button onClick={() => copyToClipboard(meta.trx_id)} className="text-muted-foreground hover:text-foreground">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                      {meta.source && (
                        <>
                          <span className="text-muted-foreground">Source</span>
                          <span className="capitalize">{meta.source}</span>
                        </>
                      )}
                      {meta.auto_matched && (
                        <>
                          <span className="text-muted-foreground">Auto Matched</span>
                          <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>Yes</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Webhook Info */}
                {meta.webhook_url && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Webhook</h4>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2">
                      <span className="text-muted-foreground">URL</span>
                      <span className="font-mono text-xs truncate">{meta.webhook_url}</span>
                    </div>
                  </div>
                )}

                {/* Payment Slip */}
                {meta.slip_url && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Payment Slip</h4>
                    <div className="flex items-center gap-3">
                      {/\.(pdf)$/i.test(meta.slip_url) ? (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={meta.slip_url} alt="Payment slip" className="w-16 h-16 rounded-lg object-cover border border-border" />
                      )}
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(meta.slip_url, '_blank')}>
                        <ExternalLink className="h-3 w-3" /> View Full Size
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  {viewTransaction.reference && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`/checkout/${viewTransaction.reference}/status`, '_blank')}>
                      <ExternalLink className="h-3 w-3" /> Checkout Status
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleSendIPN(viewTransaction)}>
                    <Send className="h-3 w-3" /> Send IPN
                  </Button>
                  {viewTransaction.status === "pending" && (
                    <Button size="sm" className="gap-1" onClick={() => { setViewTransaction(null); openApproveDialog(viewTransaction); }}>
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  {viewTransaction.status === "completed" && (
                    <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => { setViewTransaction(null); handleRefund(viewTransaction); }}>
                      <RotateCw className="h-3 w-3" /> Refund
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Transaction Status</DialogTitle>
            <DialogDescription>
              Change the status for {editTransaction?.reference || editTransaction?.id?.slice(0, 10).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditTransaction(null)}>Cancel</Button>
              <Button size="sm" disabled={editLoading || editStatus === editTransaction?.status} onClick={handleEditStatus}>
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Transaction Dialog */}
      <Dialog open={!!approveTransaction} onOpenChange={() => setApproveTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Transaction
            </DialogTitle>
            <DialogDescription>
              Approve payment for {approveTransaction?.reference || approveTransaction?.id?.slice(0, 10).toUpperCase()}
              {approveTransaction && (
                <span className="block mt-1 font-semibold text-foreground">
                  {formatCurrency(approveTransaction.amount, approveTransaction.currency)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="approve-sender" className="mb-1.5 block">Sender Number</Label>
              <Input
                id="approve-sender"
                placeholder="e.g. 01XXXXXXXXX"
                value={approveSender}
                onChange={(e) => setApproveSender(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="approve-trxid" className="mb-1.5 block">Transaction ID (TrxID)</Label>
              <Input
                id="approve-trxid"
                placeholder="e.g. TXN1234ABCD"
                value={approveTrxId}
                onChange={(e) => setApproveTrxId(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setApproveTransaction(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={approveLoading}
                onClick={handleApprove}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {approveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Approve</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
