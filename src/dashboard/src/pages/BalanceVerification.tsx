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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";

const PER_PAGE = 10;

export default function BalanceVerification() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [method, setMethod] = useState("bkash");
  const [type, setType] = useState("personal");
  const [balance, setBalance] = useState("0");

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["balance-verifications", orgId, activeBrandId],
    queryFn: async () => {
      let q = supabase.from("balance_verifications").select("*, devices(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (activeBrandId) q = q.eq("brand_id", activeBrandId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { organization_id: orgId!, method, type, balance: parseFloat(balance) || 0, brand_id: activeBrandId };
      if (editItem) {
        const { error } = await supabase.from("balance_verifications").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("balance_verifications").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "Updated!" : "Created!"); qc.invalidateQueries({ queryKey: ["balance-verifications", orgId] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from("balance_verifications").update({ [field]: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["balance-verifications", orgId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("balance_verifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted!"); qc.invalidateQueries({ queryKey: ["balance-verifications", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setMethod("bkash"); setType("personal"); setBalance("0"); };
  const openEdit = (v: any) => { setEditItem(v); setMethod(v.method); setType(v.type); setBalance(String(v.balance)); setDialogOpen(true); };

  const filtered = verifications.filter((v: any) => !search || v.method.toLowerCase().includes(search.toLowerCase()) || v.type.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Balance Verification</h1>
            <p className="text-muted-foreground text-sm">Configure balance verification rules</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Rule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? "Edit Rule" : "Add Rule"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="bkash">bKash</SelectItem><SelectItem value="nagad">Nagad</SelectItem><SelectItem value="rocket">Rocket</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="personal">Personal</SelectItem><SelectItem value="agent">Agent</SelectItem><SelectItem value="merchant">Merchant</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Balance</Label><Input type="number" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Rule"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No verification rules found.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((v: any) => (
                  <div key={v.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm capitalize">{v.method} — {v.type}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(v)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground">Balance: ৳{v.balance}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1"><span className="text-xs">Verify</span><Switch checked={v.balance_verification_enabled} onCheckedChange={(c) => toggleMutation.mutate({ id: v.id, field: "balance_verification_enabled", value: c })} /></div>
                      <div className="flex items-center gap-1"><span className="text-xs">Smart</span><Switch checked={v.smart_verification_enabled} onCheckedChange={(c) => toggleMutation.mutate({ id: v.id, field: "smart_verification_enabled", value: c })} /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Type</TableHead><TableHead>Device</TableHead><TableHead>Balance</TableHead><TableHead>Verification</TableHead><TableHead>Smart</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginated.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium capitalize">{v.method}</TableCell>
                      <TableCell className="capitalize">{v.type}</TableCell>
                      <TableCell className="text-muted-foreground">{(v as any).devices?.name || "—"}</TableCell>
                      <TableCell>৳{v.balance}</TableCell>
                      <TableCell><Switch checked={v.balance_verification_enabled} onCheckedChange={(c) => toggleMutation.mutate({ id: v.id, field: "balance_verification_enabled", value: c })} /></TableCell>
                      <TableCell><Switch checked={v.smart_verification_enabled} onCheckedChange={(c) => toggleMutation.mutate({ id: v.id, field: "smart_verification_enabled", value: c })} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(v)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">{filtered.length} total</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                  {!isMobile && Array.from({ length: totalPages }, (_, i) => (<Button key={i} variant={page === i ? "default" : "outline"} size="sm" onClick={() => setPage(i)}>{i + 1}</Button>))}
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Rule?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
