import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search, HelpCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";

const PER_PAGE = 10;

export default function Faqs() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const { activeBrandId } = useBrand();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs", orgId, activeBrandId],
    queryFn: async () => {
      let query = supabase.from("faqs").select("*").eq("organization_id", orgId!).order("order_column", { ascending: true });
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
      if (editItem) {
        const { error } = await supabase.from("faqs").update({ title, content }).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert({
          organization_id: orgId!,
          title,
          content,
          order_column: faqs.length,
          brand_id: activeBrandId || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "FAQ updated!" : "FAQ created!"); qc.invalidateQueries({ queryKey: ["faqs"] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("faqs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faqs"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("FAQ deleted!"); qc.invalidateQueries({ queryKey: ["faqs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setTitle(""); setContent(""); };
  const openEdit = (f: any) => { setEditItem(f); setTitle(f.title); setContent(f.content); setDialogOpen(true); };

  const filtered = faqs.filter((f: any) => !search || f.title.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">FAQs</h1>
            <p className="text-muted-foreground text-sm">Manage frequently asked questions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add FAQ</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? "Edit FAQ" : "Add FAQ"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Title *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="space-y-2"><Label>Content *</Label><Textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={5} /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update FAQ" : "Add FAQ"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search FAQs..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><HelpCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No FAQs found.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((f: any) => (
                  <div key={f.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm">{f.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.content}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(f)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(f.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Active</span>
                      <Switch checked={f.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: f.id, is_active: checked })} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Content</TableHead><TableHead>Order</TableHead><TableHead>Active</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginated.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">{f.content}</TableCell>
                      <TableCell>{f.order_column}</TableCell>
                      <TableCell><Switch checked={f.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: f.id, is_active: checked })} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(f)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(f.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete FAQ?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
