import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search, DollarSign, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const PER_PAGE = 10;

function formatTimeAgo(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd MMM yyyy, hh:mm a");
  } catch {
    return "-";
  }
}

export default function Currencies() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("$");
  const [exchangeRate, setExchangeRate] = useState("1");

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["currencies", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("currencies").select("*").eq("organization_id", orgId!).order("code");
      return data || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { organization_id: orgId!, code: code.trim().toUpperCase(), name: name.trim(), symbol: symbol.trim(), exchange_rate: parseFloat(exchangeRate) || 1 };
      if (editItem) {
        const { error } = await supabase.from("currencies").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("currencies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "Currency updated!" : "Currency added!"); qc.invalidateQueries({ queryKey: ["currencies", orgId] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("sync-exchange-rates", {
        body: { organization_id: orgId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Exchange rates synced!");
      qc.invalidateQueries({ queryKey: ["currencies", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to sync rates"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("currencies").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["currencies", orgId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("currencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Currency deleted!"); qc.invalidateQueries({ queryKey: ["currencies", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setCode(""); setName(""); setSymbol("$"); setExchangeRate("1"); };
  const openEdit = (c: any) => { setEditItem(c); setCode(c.code); setName(c.name); setSymbol(c.symbol); setExchangeRate(String(c.exchange_rate)); setDialogOpen(true); };

  const filtered = currencies.filter((c: any) => !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const showFrom = filtered.length === 0 ? 0 : page * PER_PAGE + 1;
  const showTo = Math.min((page + 1) * PER_PAGE, filtered.length);

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages: (number | "...")[] = [];
    if (page <= 3) {
      for (let i = 0; i < 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages - 1);
    } else if (page >= totalPages - 4) {
      pages.push(0);
      pages.push("...");
      for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      pages.push("...");
      for (let i = page - 1; i <= page + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Currencies</h1>
            <p className="text-muted-foreground text-sm">Manage supported currencies</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !orgId}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync Rates"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Currency</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editItem ? "Edit Currency" : "Add Currency"}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Code *</Label><Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="USD" maxLength={5} /></div>
                    <div className="space-y-2"><Label>Symbol *</Label><Input required value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="$" maxLength={5} /></div>
                  </div>
                  <div className="space-y-2"><Label>Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="US Dollar" /></div>
                  <div className="space-y-2"><Label>Exchange Rate</Label><Input type="number" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Currency"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search currencies..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No currencies found. Click "Sync Rates" to import all currencies automatically.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((c: any) => (
                  <div key={c.id} className="p-4 border rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{c.code}</span>
                        <span className="text-muted-foreground text-sm">{c.symbol}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.name}</p>
                    <p className="text-xs font-mono">1.00 {c.code} = {c.exchange_rate} BDT</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(c.updated_at)}</p>
                      <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.symbol}</TableCell>
                      <TableCell className="font-mono text-sm">1.00 {c.code} = {c.exchange_rate} BDT</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatTimeAgo(c.updated_at)}</TableCell>
                      <TableCell><Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalPages > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Showing {showFrom} to {showTo} of {filtered.length} entries</p>
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                    {getPageNumbers().map((p, i) =>
                      p === "..." ? (
                        <span key={`e${i}`} className="px-2 py-1 text-xs text-muted-foreground">...</span>
                      ) : (
                        <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p as number)}>{(p as number) + 1}</Button>
                      )
                    )}
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Currency?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
