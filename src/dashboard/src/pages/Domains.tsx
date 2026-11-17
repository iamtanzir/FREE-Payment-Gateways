import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search, Globe, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";

const PER_PAGE = 10;

export default function Domains() {
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
  const [domainVal, setDomainVal] = useState("");
  const [brandId, setBrandId] = useState("");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["domains", orgId, activeBrandId],
    queryFn: async () => {
      let q = supabase.from("domains").select("*, brands(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (activeBrandId) q = q.eq("brand_id", activeBrandId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-list", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id, name").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { organization_id: orgId!, domain: domainVal.trim(), brand_id: brandId || null };
      if (editItem) {
        const { error } = await supabase.from("domains").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("domains").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "Domain updated!" : "Domain added!"); qc.invalidateQueries({ queryKey: ["domains", orgId] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("domains").update({ is_primary: false }).eq("organization_id", orgId!);
      const { error } = await supabase.from("domains").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Primary domain set!"); qc.invalidateQueries({ queryKey: ["domains", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Domain deleted!"); qc.invalidateQueries({ queryKey: ["domains", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setDomainVal(""); setBrandId(""); };
  const openEdit = (d: any) => { setEditItem(d); setDomainVal(d.domain); setBrandId(d.brand_id || ""); setDialogOpen(true); };

  const filtered = domains.filter((d: any) => !search || d.domain.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
            <p className="text-muted-foreground text-sm">Manage custom domains</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Domain</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? "Edit Domain" : "Add Domain"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Domain *</Label><Input required value={domainVal} onChange={(e) => setDomainVal(e.target.value)} placeholder="pay.example.com" /></div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={brandId} onValueChange={setBrandId}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Domain"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search domains..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No domains found.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((d: any) => (
                  <div key={d.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{d.domain}</span>
                        {d.is_primary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          {!d.is_primary && <DropdownMenuItem onClick={() => setPrimaryMutation.mutate(d.id)}><Star className="mr-2 h-4 w-4" />Set Primary</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {(d as any).brands?.name && <p className="text-xs text-muted-foreground">Brand: {(d as any).brands.name}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Domain</TableHead><TableHead>Brand</TableHead><TableHead>Primary</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginated.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.domain}</TableCell>
                      <TableCell className="text-muted-foreground">{(d as any).brands?.name || "—"}</TableCell>
                      <TableCell>{d.is_primary ? <Badge variant="secondary">Primary</Badge> : "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            {!d.is_primary && <DropdownMenuItem onClick={() => setPrimaryMutation.mutate(d.id)}><Star className="mr-2 h-4 w-4" />Set Primary</DropdownMenuItem>}
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Domain?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
