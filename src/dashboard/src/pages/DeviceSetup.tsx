import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Smartphone, Wifi, WifiOff, Copy, CheckCircle2, AlertCircle, Loader2,
  MessageSquare, Shield, Zap, ArrowRight, RefreshCw, Settings2, Terminal,
  Download, QrCode, Eye, EyeOff, Pencil, Trash2, Plus, X, Clock, Activity, Link
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { isDeviceOnline } from "@/lib/device-status";
import { smsService } from "@/services/SmsService";
export default function DeviceSetup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const [deviceName, setDeviceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deviceType, setDeviceType] = useState("android");
  const [copied, setCopied] = useState<string | null>(null);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectOtp, setConnectOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // SMS filter config
  const [smsFilters, setSmsFilters] = useState<Record<string, boolean>>({
    bkash: true,
    nagad: true,
    rocket: true,
    mcash: false,
  });

  // Custom providers
  type CustomProvider = { key: string; label: string; desc: string; enabled: boolean };
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [providerDialog, setProviderDialog] = useState<{ open: boolean; mode: "add" | "edit"; index?: number }>({ open: false, mode: "add" });
  const [editingProvider, setEditingProvider] = useState({ label: "", desc: "", enabled: true });
  const [editingDefault, setEditingDefault] = useState<{ open: boolean; key: string; label: string; desc: string } | null>(null);

  const { data: device, isLoading } = useQuery({
    queryKey: ["device-setup", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!id && id !== "new",
    refetchInterval: id && id !== "new" ? 10000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (device) {
      setDeviceName(device.name);
      setPhoneNumber(device.phone_number || "");
      setDeviceType(device.device_type || "android");
      const config = (device.config as any) || {};
      setSmsFilters({
        bkash: config.bkash !== false,
        nagad: config.nagad !== false,
        rocket: config.rocket !== false,
        mcash: config.mcash === true,
      });
      setCustomProviders(Array.isArray(config.custom_providers) ? config.custom_providers : []);
    }
  }, [device]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const payload = {
        name: deviceName.trim(),
        phone_number: phoneNumber.trim() || null,
        device_type: deviceType,
        config: { ...smsFilters, custom_providers: customProviders },
        organization_id: orgId!,
      };
      if (device) {
        const { error } = await supabase.from("devices").update(payload).eq("id", device.id);
        if (error) throw error;
        return device.id;
      } else {
        const { data, error } = await supabase.from("devices").insert(payload).select().single();
        if (error) throw error;
        navigate(`/devices/${data.id}/setup`, { replace: true });
        return data.id;
      }
    },
    onSuccess: (savedDeviceId) => {
      toast.success("Device saved!");
      queryClient.invalidateQueries({ queryKey: ["device-setup", id] });
      queryClient.invalidateQueries({ queryKey: ["devices", orgId] });

      // Start heartbeat so device shows online immediately
      smsService.setDeviceId(savedDeviceId);
      smsService.startListening();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-sms`;
  const piprapayWebhookEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/piprapay-webhook`;
  const piprapayWebhookUrl = device?.webhook_key
    ? `${piprapayWebhookEndpoint}?key=${device.webhook_key}`
    : null;

  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      if (!device) throw new Error("No device");
      const newKey = "wh_" + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      const { error } = await supabase.from("devices").update({ webhook_key: newKey }).eq("id", device.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Webhook key regenerated!");
      queryClient.invalidateQueries({ queryKey: ["device-setup", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const testConnection = async () => {
    if (!device) {
      setTestResult({ success: false, message: "Save the device first." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      if (device.webhook_key) {
        const response = await fetch(piprapayWebhookEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "MH-PIPRAPAY-API-KEY": device.webhook_key,
          },
          body: JSON.stringify({}),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "PipraPay webhook test failed");
        }

        setTestResult({ success: true, message: "PipraPay header heartbeat accepted." });
      } else {
        const { error } = await supabase.functions.invoke("webhook-sms", {
          body: {
            sender: "bKash",
            message: "TEST_PING from device setup",
            device_id: device.id,
            test: true,
          },
        });

        if (error) throw error;
        setTestResult({ success: true, message: "Connection successful! Device can reach the webhook." });
      }

      await queryClient.invalidateQueries({ queryKey: ["device-setup", id] });
      await queryClient.invalidateQueries({ queryKey: ["devices", orgId] });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const isNew = !id || id === "new";

  // Live heartbeat countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!device?.last_seen_at) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [device?.last_seen_at]);

  const heartbeatInfo = useMemo(() => {
    if (!device?.last_seen_at) return null;
    const lastSeenMs = new Date(device.last_seen_at).getTime();
    if (Number.isNaN(lastSeenMs)) return null;
    const elapsedMs = now - lastSeenMs;
    const online = device.is_active && elapsedMs < 40 * 60 * 1000;
    const nextHeartbeatMs = Math.max(0, 30 * 60 * 1000 - elapsedMs);
    
    const formatDuration = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      if (totalSec < 60) return `${totalSec}s আগে`;
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      if (min < 60) return `${min}m ${sec}s আগে`;
      const hr = Math.floor(min / 60);
      return `${hr}h ${min % 60}m আগে`;
    };

    const formatCountdown = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return { online, elapsedMs, lastSeenFormatted: formatDuration(elapsedMs), nextHeartbeat: formatCountdown(nextHeartbeatMs), nextHeartbeatMs };
  }, [device, now]);

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {isNew ? "Setup New Device" : "Device Setup"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure SMS automation for MFS payment verification
            </p>
          </div>
          {device && (
            <Badge
              variant={heartbeatInfo?.online ? "default" : "secondary"}
              className="gap-1"
            >
              {heartbeatInfo?.online ? (
                <><Wifi className="h-3 w-3" /> Online</>
              ) : (
                <><WifiOff className="h-3 w-3" /> Offline</>
              )}
            </Badge>
          )}
        </div>

        {/* Live Heartbeat Status */}
        {device && heartbeatInfo && (
          <Card className="border-dashed">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${heartbeatInfo.online ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Activity className={`h-4 w-4 ${heartbeatInfo.online ? 'text-primary' : 'text-muted-foreground'}`} />
                    {heartbeatInfo.online && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Last Seen:</span>
                      <span className="text-xs font-medium">{heartbeatInfo.lastSeenFormatted}</span>
                    </div>
                    {device.device_brand || device.device_model ? (
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {[device.device_brand, device.device_model].filter(Boolean).join(" ")}
                          {device.device_version && ` • Android ${device.device_version}`}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                {heartbeatInfo.online && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Heartbeat</p>
                    <p className="text-sm font-mono font-semibold text-primary">
                      {heartbeatInfo.nextHeartbeatMs > 0 ? heartbeatInfo.nextHeartbeat : "Any moment..."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="config" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configuration</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connection</span>
              <span className="sm:hidden">Connect</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Setup Guide</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== Configuration Tab ===== */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Device Information
                </CardTitle>
                <CardDescription>Basic device details for identification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Device Name *</Label>
                    <Input
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g., bKash Office Phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <Select value={deviceType} onValueChange={setDeviceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS (Limited SMS access)</SelectItem>
                    </SelectContent>
                  </Select>
                  {deviceType === "ios" && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      iOS has limited SMS reading capability. Android is recommended.
                    </p>
                  )}
                </div>

                {device && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Device ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-background px-2 py-1 rounded border flex-1 truncate">
                        {device.id}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(device.id, "Device ID")}
                        className="shrink-0"
                      >
                        {copied === "Device ID" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS Filters
                </CardTitle>
                <CardDescription>Choose which MFS providers to monitor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Default providers */}
                {([
                  { key: "bkash", label: "bKash", desc: "Sender: bKash, 16247", color: "bg-pink-100 text-pink-700" },
                  { key: "nagad", label: "Nagad", desc: "Sender: Nagad, 16267", color: "bg-orange-100 text-orange-700" },
                  { key: "rocket", label: "Rocket", desc: "Sender: Rocket, 16216", color: "bg-purple-100 text-purple-700" },
                  { key: "mcash", label: "mCash", desc: "Sender: mCash", color: "bg-blue-100 text-blue-700" },
                ] as const).map((provider) => (
                  <div
                    key={provider.key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge variant="secondary" className={`text-xs shrink-0 ${provider.color}`}>
                        {provider.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{provider.desc}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingDefault({ open: true, key: provider.key, label: provider.label, desc: provider.desc })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={smsFilters[provider.key] ?? false}
                        onCheckedChange={(c) =>
                          setSmsFilters((prev) => ({ ...prev, [provider.key]: c }))
                        }
                      />
                    </div>
                  </div>
                ))}

                {/* Custom providers */}
                {customProviders.map((cp, idx) => (
                  <div
                    key={cp.key}
                    className="flex items-center justify-between rounded-lg border border-dashed p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge variant="secondary" className="text-xs shrink-0 bg-muted text-muted-foreground">
                        {cp.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{cp.desc}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingProvider({ label: cp.label, desc: cp.desc, enabled: cp.enabled });
                          setProviderDialog({ open: true, mode: "edit", index: idx });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setCustomProviders((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={cp.enabled}
                        onCheckedChange={(c) =>
                          setCustomProviders((prev) => prev.map((p, i) => i === idx ? { ...p, enabled: c } : p))
                        }
                      />
                    </div>
                  </div>
                ))}

                {/* Add button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    setEditingProvider({ label: "", desc: "", enabled: true });
                    setProviderDialog({ open: true, mode: "add" });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Provider
                </Button>
              </CardContent>
            </Card>

            {/* Add/Edit Custom Provider Dialog */}
            <Dialog open={providerDialog.open} onOpenChange={(o) => setProviderDialog((p) => ({ ...p, open: o }))}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{providerDialog.mode === "add" ? "Add Custom Provider" : "Edit Provider"}</DialogTitle>
                  <DialogDescription>
                    {providerDialog.mode === "add" ? "Add a new MFS provider to monitor" : "Update provider details"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider Name *</Label>
                    <Input
                      placeholder="e.g., Upay"
                      value={editingProvider.label}
                      onChange={(e) => setEditingProvider((p) => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sender Keywords</Label>
                    <Input
                      placeholder="e.g., upay, 16268"
                      value={editingProvider.desc}
                      onChange={(e) => setEditingProvider((p) => ({ ...p, desc: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Enabled</Label>
                    <Switch
                      checked={editingProvider.enabled}
                      onCheckedChange={(c) => setEditingProvider((p) => ({ ...p, enabled: c }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setProviderDialog({ open: false, mode: "add" })}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!editingProvider.label.trim()}
                    onClick={() => {
                      const key = editingProvider.label.trim().toLowerCase().replace(/\s+/g, "_");
                      const newProv: CustomProvider = {
                        key,
                        label: editingProvider.label.trim(),
                        desc: editingProvider.desc.trim() || `Sender: ${editingProvider.label.trim()}`,
                        enabled: editingProvider.enabled,
                      };
                      if (providerDialog.mode === "add") {
                        setCustomProviders((prev) => [...prev, newProv]);
                      } else if (providerDialog.index !== undefined) {
                        setCustomProviders((prev) => prev.map((p, i) => i === providerDialog.index ? newProv : p));
                      }
                      setProviderDialog({ open: false, mode: "add" });
                      toast.success(providerDialog.mode === "add" ? "Provider added!" : "Provider updated!");
                    }}
                  >
                    {providerDialog.mode === "add" ? "Add" : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Default Provider Dialog */}
            <Dialog open={!!editingDefault?.open} onOpenChange={(o) => !o && setEditingDefault(null)}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit {editingDefault?.label}</DialogTitle>
                  <DialogDescription>Update sender keywords for this provider</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider Name</Label>
                    <Input value={editingDefault?.label || ""} disabled className="opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sender Keywords</Label>
                    <Input
                      value={editingDefault?.desc || ""}
                      onChange={(e) => setEditingDefault((prev) => prev ? { ...prev, desc: e.target.value } : prev)}
                      placeholder="e.g., bKash, 16247"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setEditingDefault(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => {
                    toast.success(`${editingDefault?.label} keywords updated!`);
                    setEditingDefault(null);
                  }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !deviceName.trim()}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : isNew ? (
                "Create Device"
              ) : (
                "Save Changes"
              )}
            </Button>
          </TabsContent>

          {/* ===== Connection Tab ===== */}
          <TabsContent value="connection" className="space-y-4">
            {/* Connect Device Card - PipraPay Style */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="h-4 w-4" /> Connect Device
                </CardTitle>
                <CardDescription>
                  Connect your PipraPay Companion App to this device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info Alert */}
                <div className="rounded-lg bg-muted/60 border p-3">
                  <p className="text-sm">
                    Download the <strong>PipraPay Companion App</strong> (
                    <a
                      href="https://play.google.com/store/apps/details?id=com.qubeplug.billpax_tools"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Android
                    </a>
                    ) on your mobile device to connect it with your account.
                  </p>
                </div>

                {!device ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      Save the device first from the Configuration tab to generate connection credentials.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Generate OTP Button */}
                    {!connectOtp && (
                      <Button
                        onClick={async () => {
                          setGeneratingOtp(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("validate-device-otp", {
                              body: { action: "generate", device_id: device.id },
                            });
                            if (error) throw error;
                            if (data?.otp) {
                              setConnectOtp(data.otp);
                              toast.success("OTP generated! Valid for 10 minutes.");
                            } else {
                              throw new Error("Failed to generate OTP");
                            }
                          } catch (err: any) {
                            toast.error(err.message || "Failed to generate OTP");
                          } finally {
                            setGeneratingOtp(false);
                          }
                        }}
                        disabled={generatingOtp}
                        className="w-full"
                      >
                        {generatingOtp ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                          <><QrCode className="mr-2 h-4 w-4" /> Generate Connection Credentials</>
                        )}
                      </Button>
                    )}

                    {/* QR Code + Credentials */}
                    {connectOtp && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Scan this QR code in your PipraPay Companion app to connect your device automatically:
                        </p>

                        {/* QR Code */}
                        <div className="flex justify-center">
                          <div className="border rounded-lg p-4 bg-background inline-block">
                            <QRCodeSVG
                              value={`${window.location.origin}----${connectOtp}`}
                              size={200}
                              level="M"
                            />
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Or connect manually using your credentials:
                        </p>

                        {/* Base URL */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Base URL <span className="text-destructive">*</span></Label>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}/`}
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(`${window.location.origin}/`, "Base URL")}
                            >
                              {copied === "Base URL" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>

                        {/* One-Time Password */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">One-Time Password <span className="text-destructive">*</span></Label>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={connectOtp}
                              className="font-mono text-sm font-semibold tracking-wider"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(connectOtp, "OTP")}
                            >
                              {copied === "OTP" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            ⏱ This OTP expires in 10 minutes. Generate a new one if needed.
                          </p>
                        </div>

                        {/* Regenerate Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={async () => {
                            setGeneratingOtp(true);
                            try {
                              const { data, error } = await supabase.functions.invoke("validate-device-otp", {
                                body: { action: "generate", device_id: device.id },
                              });
                              if (error) throw error;
                              if (data?.otp) {
                                setConnectOtp(data.otp);
                                toast.success("New OTP generated!");
                              }
                            } catch (err: any) {
                              toast.error(err.message || "Failed to regenerate");
                            } finally {
                              setGeneratingOtp(false);
                            }
                          }}
                          disabled={generatingOtp}
                        >
                          <RefreshCw className={`h-3 w-3 ${generatingOtp ? "animate-spin" : ""}`} />
                          Regenerate OTP
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Original Webhook Configuration */}
            {device && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Webhook Configuration
                  </CardTitle>
                  <CardDescription>Use these credentials in your Android app</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Webhook URL</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                      >
                        {copied === "Webhook URL" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Device ID</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={device.id}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(device.id, "Device ID")}
                      >
                        {copied === "Device ID" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Advanced: Webhook Key (for manual/API users) */}
            {device && piprapayWebhookUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Advanced: Direct Webhook
                  </CardTitle>
                  <CardDescription>For manual API integration (advanced users only)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Webhook URL with API Key</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Input
                          readOnly
                          type={showWebhookUrl ? "text" : "password"}
                          value={piprapayWebhookUrl}
                          className="font-mono text-xs pr-8"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                        >
                          {showWebhookUrl ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(piprapayWebhookUrl, "PipraPay URL")}
                      >
                        {copied === "PipraPay URL" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => regenerateKeyMutation.mutate()}
                    disabled={regenerateKeyMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 ${regenerateKeyMutation.isPending ? "animate-spin" : ""}`} />
                    Regenerate Key
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Test Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Test Connection
                </CardTitle>
                <CardDescription>Send a test ping to verify the webhook is reachable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={testConnection}
                  disabled={testing || !device}
                  variant="outline"
                  className="w-full"
                >
                  {testing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Test Connection</>
                  )}
                </Button>

                {testResult && (
                  <div
                    className={`rounded-lg border p-3 flex items-start gap-2 ${
                      testResult.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <p className={`text-xs ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                      {testResult.message}
                    </p>
                  </div>
                )}

                {device && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-medium">Last Seen</p>
                    <p className="text-xs text-muted-foreground">
                      {device.last_seen_at
                        ? new Date(device.last_seen_at).toLocaleString()
                        : "Never connected"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Setup Guide Tab ===== */}
          <TabsContent value="guide" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🚀 Quick Start Guide</CardTitle>
                <CardDescription>Follow these steps to set up SMS automation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Configure Device",
                    desc: 'Go to the "Configuration" tab and set your device name, phone number, and SMS filters.',
                    icon: <Settings2 className="h-5 w-5" />,
                  },
                  {
                    step: 2,
                    title: "Install Android App",
                    desc: "Build the Android app using Capacitor or download the APK. Install it on the phone that receives MFS SMS messages.",
                    icon: <Download className="h-5 w-5" />,
                  },
                  {
                    step: 3,
                    title: "Enter Device ID",
                    desc: 'Copy the Device ID from the "Connection" tab and paste it into the Android app settings.',
                    icon: <QrCode className="h-5 w-5" />,
                  },
                  {
                    step: 4,
                    title: "Grant SMS Permission",
                    desc: "Allow the Android app to read SMS messages. This is required for automatic payment verification.",
                    icon: <Shield className="h-5 w-5" />,
                  },
                  {
                    step: 5,
                    title: "Test Connection",
                    desc: 'Go to the "Connection" tab and click "Test Connection" to verify everything works.',
                    icon: <Zap className="h-5 w-5" />,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {item.icon}
                      </div>
                      {idx < 4 && <div className="w-px h-full bg-border mt-2" />}
                    </div>
                    <div className="pb-6">
                      <h4 className="font-medium text-sm">
                        Step {item.step}: {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">⚙️ How Auto-Verification Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { emoji: "📱", text: "Customer pays via bKash/Nagad" },
                    { emoji: "💬", text: "MFS provider sends SMS to your phone" },
                    { emoji: "📤", text: "Android app reads SMS and sends to webhook" },
                    { emoji: "🔍", text: "System parses SMS — extracts Amount, TrxID, Sender" },
                    { emoji: "🎯", text: "Matches with pending transaction (by TrxID or Amount)" },
                    { emoji: "✅", text: "Transaction auto-approved → merchant notified" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-lg shrink-0">{item.emoji}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <p className="text-sm">{item.text}</p>
                      </div>
                      {idx < 5 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Android Code Snippet */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> Android SMS BroadcastReceiver
                </CardTitle>
                <CardDescription>Add this to your Android app for SMS listening</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="rounded-lg bg-zinc-950 text-zinc-100 p-4 text-[11px] leading-relaxed overflow-x-auto">
{`class SmsReceiver : BroadcastReceiver() {
  companion object {
    private const val WEBHOOK_URL = "YOUR_WEBHOOK_URL"
    private const val DEVICE_ID = "YOUR_DEVICE_ID"
    private val MFS_SENDERS = listOf(
      "bKash", "16247", "Nagad", "16267",
      "Rocket", "16216", "mCash"
    )
  }

  override fun onReceive(context: Context, intent: Intent) {
    val messages = Telephony.Sms.Intents
      .getMessagesFromIntent(intent)
    
    for (sms in messages) {
      val sender = sms.originatingAddress ?: continue
      val body = sms.messageBody ?: continue
      
      // Only process MFS SMS
      if (MFS_SENDERS.none { 
        sender.contains(it, ignoreCase = true)
      }) continue
      
      // Send to webhook
      CoroutineScope(Dispatchers.IO).launch {
        val json = JSONObject().apply {
          put("sender", sender)
          put("message", body)
          put("device_id", DEVICE_ID)
        }
        
        val request = Request.Builder()
          .url(WEBHOOK_URL)
          .post(json.toString()
            .toRequestBody(
              "application/json".toMediaType()
            ))
          .build()
        
        OkHttpClient().newCall(request).execute()
      }
    }
  }
}`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() =>
                    copyToClipboard(
                      `class SmsReceiver : BroadcastReceiver() { /* ... */ }`,
                      "Kotlin Code"
                    )
                  }
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
