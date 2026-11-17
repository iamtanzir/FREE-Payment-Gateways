import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Loader2, Pencil, ChevronDown, Eye, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginationControls } from "@/components/PaginationControls";

export default function Customers() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");

  const filters = useMemo(() => {
    const f: any[] = [{ column: "organization_id", operator: "eq", value: orgId }];
    if (activeBrandId) f.push({ column: "brand_id", operator: "eq", value: activeBrandId });
    return f;
  }, [orgId, activeBrandId]);

  const orFilter = useMemo(() => {
    if (!search) return undefined;
    const s = `%${search}%`;
    return `name.ilike.${s},email.ilike.${s},phone.ilike.${s}`;
  }, [search]);

  const { data: customers, isLoading, pagination } = usePaginatedQuery({
    queryKey: ["customers", orgId, activeBrandId, search],
    tableName: "customers",
    select: "*",
    filters,
    orFilter,
    orderBy: { column: "created_at", ascending: false },
    perPage: 20,
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { email: newEmail.trim(), name: newName.trim() || null, phone: newPhone.trim() || null, company: company.trim() || null, city: city.trim() || null, state: state.trim() || null, postcode: postcode.trim() || null, country: country.trim() || null };
      if (editItem) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        payload.organization_id = orgId!; payload.created_from = "manual"; payload.brand_id = activeBrandId || null;
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "Customer updated!" : "Customer added!"); queryClient.invalidateQueries({ queryKey: ["customers", orgId] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setNewName(""); setNewEmail(""); setNewPhone(""); setCompany(""); setCity(""); setState(""); setPostcode(""); setCountry(""); };
  const openEdit = (c: any) => { setEditItem(c); setNewName(c.name || ""); setNewEmail(c.email); setNewPhone(c.phone || ""); setCompany(c.company || ""); setCity(c.city || ""); setState(c.state || ""); setPostcode(c.postcode || ""); setCountry(c.country || ""); setDialogOpen(true); };
  const getInitials = (name: string | null, email: string) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase();

  const ActionsDropdown = ({ c }: { c: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1"><ChevronDown className="h-3 w-3" /> Actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewItem(c)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">Customers</h1><p className="text-muted-foreground text-sm">Manage your customer database</p></div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Customer</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" /></div>
                  <div className="space-y-2"><Label>Email *</Label><Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Phone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Customer"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }} /></div></div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : customers.length === 0 ? (
              <div className="text-center py-16"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No customers found.</p></div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {customers.map((c) => (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">{getInitials(c.name, c.email)}</div>
                        <div><p className="font-medium text-sm">{c.name || "—"}</p><p className="text-xs text-muted-foreground">{c.email}</p></div>
                      </div>
                      <ActionsDropdown c={c} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Phone</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Company</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Location</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Source</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">{getInitials(c.name, c.email)}</div><div><p className="font-medium">{c.name || "—"}</p><p className="text-xs text-muted-foreground">{c.email}</p></div></div></td>
                        <td className="p-4 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="p-4 text-muted-foreground">{c.company || "—"}</td>
                        <td className="p-4 text-muted-foreground text-xs">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="p-4"><span className="text-xs capitalize bg-muted px-2 py-0.5 rounded">{c.created_from || "manual"}</span></td>
                        <td className="p-4 text-right"><ActionsDropdown c={c} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PaginationControls pagination={pagination} />
          </CardContent>
        </Card>

        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
            {viewItem && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{viewItem.name || "—"}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{viewItem.email}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> {viewItem.phone || "—"}</div>
                <div><span className="text-muted-foreground">Company:</span> {viewItem.company || "—"}</div>
                <div><span className="text-muted-foreground">City:</span> {viewItem.city || "—"}</div>
                <div><span className="text-muted-foreground">Country:</span> {viewItem.country || "—"}</div>
                <div><span className="text-muted-foreground">Source:</span> <span className="capitalize">{viewItem.created_from || "manual"}</span></div>
                <div><span className="text-muted-foreground">Joined:</span> {new Date(viewItem.created_at).toLocaleDateString()}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}