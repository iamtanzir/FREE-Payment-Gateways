import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Loader2, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Link2, Folder, CheckCircle2, XCircle, Clock, Tag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";

const STATUS_TABS = [
  { value: "all", label: "All", icon: Folder, color: "text-blue-400" },
  { value: "active", label: "Active", icon: CheckCircle2, color: "text-green-400" },
  { value: "inactive", label: "Inactive", icon: XCircle, color: "text-red-400" },
  { value: "expired", label: "Expired", icon: Clock, color: "text-yellow-400" },
];

export default function PaymentLinks() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultLinkOpen, setDefaultLinkOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [brandId, setBrandId] = useState<string | null>(activeBrandId || null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["payment-links", orgId, activeBrandId],
    queryFn: async () => {
      let query = supabase
        .from("payment_links")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (activeBrandId) {
        query = query.eq("brand_id", activeBrandId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: title.trim(),
        amount: parseFloat(amount),
        currency,
        product_description: description.trim() || null,
        quantity: parseInt(quantity) || 0,
        redirect_url: redirectUrl.trim() || null,
        expires_at: expiresAt || null,
        brand_id: brandId || null,
      };
      if (editItem) {
        const { error } = await supabase.from("payment_links").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        payload.organization_id = orgId!;
        payload.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + `-${Date.now()}`;
        const { error } = await supabase.from("payment_links").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editItem ? "Link updated!" : "Payment link created!");
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      if (orgId && user?.id) {
        logActivity({
          action: editItem ? "update" : "create",
          entityType: "payment_link",
          entityId: editItem?.id,
          orgId,
          userId: user.id,
          brandId: brandId || activeBrandId,
          details: { title: title.trim(), amount: parseFloat(amount) },
        });
      }
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("payment_links").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-links"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false); setEditItem(null);
    setTitle(""); setAmount(""); setCurrency("USD");
    setDescription(""); setQuantity("0"); setRedirectUrl(""); setExpiresAt("");
    setBrandId(activeBrandId || null);
  };

  const openEdit = (link: any) => {
    setEditItem(link); setTitle(link.title); setAmount(String(link.amount));
    setCurrency(link.currency); setDescription(link.product_description || "");
    setQuantity(String(link.quantity || 0)); setRedirectUrl(link.redirect_url || "");
    setExpiresAt(link.expires_at ? link.expires_at.split("T")[0] : "");
    setBrandId(link.brand_id || null);
    setDialogOpen(true);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${slug}`);
    toast.success("Link copied to clipboard");
  };

  const getLinkStatus = (link: any) => {
    if (link.expires_at && new Date(link.expires_at) < new Date()) return "expired";
    return link.is_active ? "active" : "inactive";
  };

  const getBrandName = (bId: string | null) => {
    if (!bId) return null;
    return brands.find((b: any) => b.id === bId)?.name || null;
  };

  const filtered = useMemo(() => {
    return links.filter((l: any) => {
      const status = getLinkStatus(l);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (brandFilter !== "all") {
        if (brandFilter === "none" && l.brand_id) return false;
        if (brandFilter !== "none" && l.brand_id !== brandFilter) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return l.title.toLowerCase().includes(s) || l.slug.toLowerCase().includes(s);
      }
      return true;
    });
  }, [links, statusFilter, brandFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: links.length };
    links.forEach((l: any) => {
      const s = getLinkStatus(l);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [links]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const ActionsDropdown = ({ link }: { link: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <ChevronDown className="h-3 w-3" /> Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => copyLink(link.slug)}>
          <Copy className="mr-2 h-4 w-4" /> Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setViewItem(link)}>
          <Eye className="mr-2 h-4 w-4" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(link)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: link.id, is_active: !link.is_active })}>
          <Switch className="mr-2 scale-75" checked={link.is_active} /> {link.is_active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Payment Link</p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Payment Link</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (currentOrg?.id) {
                setDefaultLinkOpen(true);
              } else {
                toast.info("No organization selected");
              }
            }}>
              <ExternalLink className="mr-2 h-4 w-4" />Default Link
            </Button>
            {/* Default Link Modal */}
            <Dialog open={defaultLinkOpen} onOpenChange={setDefaultLinkOpen}>
              <DialogContent className="max-w-sm animate-scale-in" aria-describedby="default-link-desc">
                <DialogHeader>
                  <DialogTitle className="text-center text-lg font-semibold">Default Payment Link</DialogTitle>
                  <p id="default-link-desc" className="sr-only">Copy or open the default payment link</p>
                </DialogHeader>
                <p className="text-center text-sm text-muted-foreground break-all px-2">
                  {(() => {
                    let url = `${window.location.origin}/payment-link/default/${currentOrg?.id || ""}`;
                    if (activeBrandId) url += `?brand_id=${activeBrandId}`;
                    return url;
                  })()}
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <Button className="w-full" onClick={() => {
                    let url = `${window.location.origin}/payment-link/default/${currentOrg?.id || ""}`;
                    if (activeBrandId) url += `?brand_id=${activeBrandId}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied to clipboard");
                    setDefaultLinkOpen(false);
                  }}>
                    <Copy className="mr-2 h-4 w-4" />Copy Link
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => {
                    let url = `${window.location.origin}/payment-link/default/${currentOrg?.id || ""}`;
                    if (activeBrandId) url += `?brand_id=${activeBrandId}`;
                    window.open(url, "_blank");
                    setDefaultLinkOpen(false);
                  }}>
                    <ExternalLink className="mr-2 h-4 w-4" />Open in New Tab
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Payment Link</Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem ? "Edit Payment Link" : "Create Payment Link"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Product Name *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pro Plan Subscription" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description..." rows={2} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Amount *</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="49.00" /></div>
                  <div className="space-y-2"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" /></div>
                  <div className="space-y-2"><Label>Qty (0=∞)</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                </div>
                {/* Brand selector */}
                {brands.length > 0 && (
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select value={brandId || "none"} onValueChange={(v) => setBrandId(v === "none" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Brand</SelectItem>
                        {brands.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2"><Label>Redirect URL</Label><Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://example.com/thank-you" /></div>
                <div className="space-y-2"><Label>Expires At</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editItem ? "Update Link" : "Create Link"}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Tabs */}
        <div className={`flex items-center gap-1 border-b border-border pb-3 ${isMobile ? "overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4" : "flex-wrap"}`}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${statusFilter === tab.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />
              {tab.label}
              {statusCounts[tab.value] ? <span className="text-xs opacity-70">({statusCounts[tab.value]})</span> : null}
            </button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {/* Search + Brand Filter */}
            <div className="p-3 md:p-4 border-b border-border flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search links..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
              </div>
              {brands.length > 0 && (
                <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px] shrink-0">
                    <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    <SelectItem value="none">No Brand</SelectItem>
                    {brands.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16">
                <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No payment links found.</p>
              </div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {paginated.map((link: any) => (
                  <div key={link.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{link.slug}</p>
                      </div>
                      <StatusBadge status={getLinkStatus(link)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{link.currency} {Number(link.amount).toFixed(2)}</p>
                        {getBrandName(link.brand_id) && (
                          <Badge variant="outline" className="text-[10px] mt-1"><Tag className="h-2.5 w-2.5 mr-1" />{getBrandName(link.brand_id)}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(link.created_at), "MMM dd, yyyy")}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {link.quantity > 0 && <span>Qty: {link.quantity}</span>}
                        {link.expires_at && <span>Exp: {new Date(link.expires_at).toLocaleDateString()}</span>}
                      </div>
                      <ActionsDropdown link={link} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground p-4">Title</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Brand</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Slug</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Created</th>
                      <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((link: any) => (
                      <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium">{link.title}</td>
                        <td className="p-4">
                          {getBrandName(link.brand_id) ? (
                            <Badge variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{getBrandName(link.brand_id)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4">{link.currency} {Number(link.amount).toFixed(2)}</td>
                        <td className="p-4 font-mono text-xs text-muted-foreground max-w-[200px] truncate">{link.slug}</td>
                        <td className="p-4"><StatusBadge status={getLinkStatus(link)} /></td>
                        <td className="p-4 text-muted-foreground">{format(new Date(link.created_at), "yyyy-MM-dd")}</td>
                        <td className="p-4 text-right"><ActionsDropdown link={link} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{filtered.length} results</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {!isMobile && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant={currentPage === p ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Payment Link Details</DialogTitle></DialogHeader>
            {viewItem && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Title:</span> <strong>{viewItem.title}</strong></div>
                  <div><span className="text-muted-foreground">Amount:</span> <strong>{viewItem.currency} {Number(viewItem.amount).toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={getLinkStatus(viewItem)} /></div>
                  <div><span className="text-muted-foreground">Qty:</span> {viewItem.quantity || "Unlimited"}</div>
                  <div><span className="text-muted-foreground">Brand:</span> {getBrandName(viewItem.brand_id) || "None"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Slug:</span> <code className="text-xs">{viewItem.slug}</code></div>
                  {viewItem.product_description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span><p className="mt-1">{viewItem.product_description}</p></div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
