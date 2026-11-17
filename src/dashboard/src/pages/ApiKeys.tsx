import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreHorizontal, Trash2, Search, Key, Copy, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

const PER_PAGE = 10;

interface ApiKeyRow {
  id: string;
  organization_id: string;
  brand_id: string | null;
  label: string;
  key_prefix: string;
  is_active: boolean;
  rate_limit: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function ApiKeys() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [endpointsOpen, setEndpointsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [label, setLabel] = useState("");
  const [rateLimit, setRateLimit] = useState("1000");
  const [newKey, setNewKey] = useState<string | null>(null);

  const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const endpoints = [
    { label: "Base URL", url: FUNCTIONS_BASE, help: "Root API endpoint for all FREE Payment Gateways calls. Do NOT use pay.example.com/api/... — that is the marketing site." },
    { label: "Create Payment (Redirect Checkout)", url: `${FUNCTIONS_BASE}/create-payment`, help: "POST — creates a payment session and returns checkout_url to redirect the customer." },
    { label: "Verify Payment", url: `${FUNCTIONS_BASE}/verify-payment`, help: "POST — checks the status of a transaction by transaction_id or reference." },
    { label: "Refund Payment", url: `${FUNCTIONS_BASE}/refund-payment`, help: "POST — initiates a refund for a completed transaction." },
  ];

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", orgId, activeBrandId],
    queryFn: async () => {
      // Never select key_hash: only the hash is stored and it must never reach a browser.
      let query = supabase
        .from("api_keys")
        .select("id, organization_id, brand_id, label, key_prefix, is_active, rate_limit, last_used_at, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (activeBrandId) query = query.eq("brand_id", activeBrandId);
      const { data } = await query;
      return (data || []) as ApiKeyRow[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const key = generateApiKey();
      const prefix = key.substring(0, 12);
      const hash = await hashApiKey(key);
      const { error } = await supabase.from("api_keys").insert({ organization_id: orgId!, brand_id: activeBrandId || null, label: label.trim(), key_prefix: prefix, key_hash: hash, rate_limit: parseInt(rateLimit) || 1000 });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => { setNewKey(key); toast.success("API key created!"); qc.invalidateQueries({ queryKey: ["api-keys", orgId] }); setLabel(""); setRateLimit("1000"); },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys", orgId] }),
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("API key deleted!"); qc.invalidateQueries({ queryKey: ["api-keys", orgId] }); },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  const closeDialog = () => { setDialogOpen(false); setNewKey(null); setLabel(""); setRateLimit("1000"); };

  const filtered = keys.filter((k: ApiKeyRow) => !search || k.label.toLowerCase().includes(search.toLowerCase()) || k.key_prefix.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground text-sm">Manage your API keys</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => setEndpointsOpen(true)}><Globe className="mr-2 h-4 w-4" />Api Endpoints</Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Key</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle></DialogHeader>
              {newKey ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Copy this key now. You won't see it again.</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={newKey} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <Button className="w-full" onClick={closeDialog}>Done</Button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2"><Label>Label *</Label><Input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Production key" /></div>
                  <div className="space-y-2"><Label>Rate Limit (per hour)</Label><Input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Key"}</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
          </div>

          <Dialog open={endpointsOpen} onOpenChange={setEndpointsOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Api Endpoints</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {endpoints.map((ep) => (
                  <div key={ep.label} className="space-y-1">
                    <Label className="font-semibold">{ep.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={ep.url} className="font-mono text-xs bg-muted" />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(ep.url); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{ep.help}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setEndpointsOpen(false)}>Cancel</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search keys..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><Key className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No API keys found.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((k: ApiKeyRow) => (
                  <div key={k.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{k.label}</p>
                        <p className="text-xs font-mono text-muted-foreground">{k.key_prefix}...</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(k.key_prefix); toast.success("Prefix copied!"); }}><Copy className="mr-2 h-4 w-4" />Copy Prefix</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(k.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "Active" : "Inactive"}</Badge>
                        <span className="text-xs text-muted-foreground">{k.rate_limit}/hr</span>
                      </div>
                      <Switch checked={k.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: k.id, is_active: checked })} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Prefix</TableHead><TableHead>Status</TableHead><TableHead>Rate Limit</TableHead><TableHead>Created</TableHead><TableHead>Last Used</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginated.map((k: ApiKeyRow) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.label}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{k.key_prefix}...</TableCell>
                      <TableCell><Switch checked={k.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: k.id, is_active: checked })} /></TableCell>
                      <TableCell>{k.rate_limit}/hr</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(k.created_at), "PP")}</TableCell>
                      <TableCell className="text-muted-foreground">{k.last_used_at ? format(new Date(k.last_used_at), "PP") : "Never"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(k.key_prefix); toast.success("Prefix copied!"); }}><Copy className="mr-2 h-4 w-4" />Copy Prefix</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(k.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete API Key?</AlertDialogTitle><AlertDialogDescription>This will permanently revoke this key.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
