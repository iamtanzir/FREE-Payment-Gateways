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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const PER_PAGE = 10;
const CHANNEL_TYPES = Constants.public.Enums.notification_channel_type;

export default function NotificationChannels() {
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
  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState<string>("email");
  const [configValue, setConfigValue] = useState("");

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["notification-channels", orgId, activeBrandId],
    queryFn: async () => {
      let q = supabase.from("notification_channels").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (activeBrandId) q = q.eq("brand_id", activeBrandId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { organization_id: orgId!, name: name.trim(), channel_type: channelType as any, config: { value: configValue.trim() }, brand_id: activeBrandId };
      if (editItem) {
        const { error } = await supabase.from("notification_channels").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notification_channels").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editItem ? "Channel updated!" : "Channel added!"); qc.invalidateQueries({ queryKey: ["notification-channels", orgId] }); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("notification_channels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-channels", orgId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Channel deleted!"); qc.invalidateQueries({ queryKey: ["notification-channels", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setName(""); setChannelType("email"); setConfigValue(""); };
  const openEdit = (c: any) => { setEditItem(c); setName(c.name); setChannelType(c.channel_type); setConfigValue((c.config as any)?.value || ""); setDialogOpen(true); };

  const configLabel = (t: string) => {
    if (t === "email") return "Email Address";
    if (t === "telegram") return "Chat ID";
    if (t === "discord" || t === "slack" || t === "webhook") return "Webhook URL";
    return "Config Value";
  };

  const filtered = channels.filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.channel_type.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notification Channels</h1>
            <p className="text-muted-foreground text-sm">Configure notification delivery channels</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Channel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? "Edit Channel" : "Add Channel"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="My Channel" /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={channelType} onValueChange={setChannelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANNEL_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{configLabel(channelType)}</Label><Input value={configValue} onChange={(e) => setConfigValue(e.target.value)} placeholder={configLabel(channelType)} /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Channel"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search channels..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No channels found.</p></div>
            ) : isMobile ? (
              <div className="space-y-3">
                {paginated.map((c: any) => (
                  <div key={c.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.name}</span>
                        <Badge variant="outline" className="capitalize text-xs">{c.channel_type}</Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{(c.config as any)?.value || "—"}</p>
                      <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Config</TableHead><TableHead>Active</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginated.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{c.channel_type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground max-w-[250px] truncate">{(c.config as any)?.value || "—"}</TableCell>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Channel?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
