import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Smartphone, Loader2, Trash2, Wifi, WifiOff, ChevronDown, Pencil, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { isDeviceOnline } from "@/lib/device-status";

export default function Devices() {
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices", orgId, activeBrandId],
    queryFn: async () => {
      let q = supabase.from("devices").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (activeBrandId) q = q.eq("brand_id", activeBrandId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) {
        const { error } = await supabase.from("devices").update({ name: deviceName.trim(), phone_number: phoneNumber.trim() || null }).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devices").insert({ organization_id: orgId!, name: deviceName.trim(), phone_number: phoneNumber.trim() || null, brand_id: activeBrandId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editItem ? "Device updated!" : "Device added!");
      queryClient.invalidateQueries({ queryKey: ["devices", orgId] });
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("devices").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices", orgId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Device removed!"); queryClient.invalidateQueries({ queryKey: ["devices", orgId] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditItem(null); setDeviceName(""); setPhoneNumber(""); };
  const openEdit = (dev: any) => { setEditItem(dev); setDeviceName(dev.name); setPhoneNumber(dev.phone_number || ""); setDialogOpen(true); };
  const onlineCount = devices.filter((d: any) => isDeviceOnline(d)).length;

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">Devices</h1><p className="text-muted-foreground text-sm">Manage MFS automation devices</p></div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild><Button size="sm" onClick={() => navigate("/devices/new/setup")}><Plus className="mr-2 h-4 w-4" />Add Device</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? "Edit Device" : "Add Device"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Device Name *</Label><Input required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="My bKash Phone" /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+8801XXXXXXXXX" /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update Device" : "Add Device"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Devices</p><p className="text-2xl font-bold">{devices.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Online</p><p className="text-2xl font-bold text-green-600">{onlineCount}</p></CardContent></Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : devices.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No devices added yet.</p></CardContent></Card>
        ) : isMobile ? (
          <div className="space-y-3">
            {devices.map((dev: any) => (
              <Card key={dev.id} className="shadow-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isDeviceOnline(dev) ? "bg-green-100" : "bg-muted"}`}>
                        <Smartphone className={`h-5 w-5 ${isDeviceOnline(dev) ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{dev.name}</h3>
                        {dev.phone_number && <p className="text-xs text-muted-foreground">{dev.phone_number}</p>}
                      </div>
                    </div>
                    <Badge variant={isDeviceOnline(dev) ? "default" : "secondary"} className="text-xs">
                      {isDeviceOnline(dev) ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  {(dev.device_brand || dev.device_model || dev.device_version) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                      <Smartphone className="h-3 w-3 shrink-0" />
                      <span>
                        {[dev.device_brand, dev.device_model].filter(Boolean).join(" ") || "Unknown Device"}
                        {dev.device_version && <span className="ml-1 opacity-70">• Android {dev.device_version}</span>}
                        {dev.device_api_level && <span className="ml-1 opacity-70">(API {dev.device_api_level})</span>}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Switch checked={dev.is_active} onCheckedChange={(c) => toggleMutation.mutate({ id: dev.id, is_active: c })} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1"><ChevronDown className="h-3 w-3" /> Actions</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/devices/${dev.id}/setup`)}><Settings2 className="mr-2 h-4 w-4" /> Setup</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(dev)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(dev.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Device</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Phone</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Active</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Last Seen</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {devices.map((dev: any) => (
                      <tr key={dev.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{dev.name}</span></div>
                          {(dev.device_brand || dev.device_model) && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-6">{[dev.device_brand, dev.device_model].filter(Boolean).join(" ")}{dev.device_version ? ` • Android ${dev.device_version}` : ""}</p>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{dev.phone_number || "—"}</td>
                        <td className="p-4"><Badge variant={isDeviceOnline(dev) ? "default" : "secondary"} className="text-xs">{isDeviceOnline(dev) ? <><Wifi className="h-3 w-3 mr-1" />Online</> : <><WifiOff className="h-3 w-3 mr-1" />Offline</>}</Badge></td>
                        <td className="p-4"><Switch checked={dev.is_active} onCheckedChange={(c) => toggleMutation.mutate({ id: dev.id, is_active: c })} /></td>
                        <td className="p-4 text-muted-foreground text-xs">{dev.last_seen_at ? new Date(dev.last_seen_at).toLocaleString() : "—"}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1"><ChevronDown className="h-3 w-3" /> Actions</Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/devices/${dev.id}/setup`)}><Settings2 className="mr-2 h-4 w-4" /> Setup</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(dev)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteId(dev.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Device?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}