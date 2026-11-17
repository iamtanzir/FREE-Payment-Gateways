import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { Save, Shield, Globe, Bell, Wrench } from "lucide-react";

interface SettingsMap { [key: string]: string }

const SETTING_KEYS = [
  "site_name", "site_url", "timezone", "currency", "language",
  "maintenance_mode", "maintenance_message",
  "two_factor_enabled", "two_factor_method",
  "default_transaction_status", "auto_approve_threshold",
  "notification_email", "notification_on_payment", "notification_on_refund",
];

export default function GeneralSettings() {
  const { currentOrg } = useOrg();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentOrg?.id) loadSettings(); }, [currentOrg?.id]);

  const loadSettings = async () => {
    const { data } = await supabase.from("settings").select("name, value")
      .eq("organization_id", currentOrg!.id).in("name", SETTING_KEYS);
    const m: SettingsMap = {};
    data?.forEach(s => { if (s.value) m[s.name] = s.value; });
    setSettings(m);
    setLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    setSaving(true);
    try {
      for (const [name, value] of Object.entries(settings)) {
        if (!SETTING_KEYS.includes(name)) continue;
        const { data: existing } = await supabase.from("settings")
          .select("id").eq("organization_id", currentOrg.id).eq("name", name).maybeSingle();
        if (existing) {
          await supabase.from("settings").update({ value }).eq("id", existing.id);
        } else {
          await supabase.from("settings").insert({ organization_id: currentOrg.id, name, value });
        }
      }
      toast.success("Settings saved successfully");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-1" />General</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notifications</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1" />Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input value={settings.site_name || ""} onChange={e => updateSetting("site_name", e.target.value)} placeholder="My Payment Gateway" />
                </div>
                <div className="space-y-2">
                  <Label>Site URL</Label>
                  <Input value={settings.site_url || ""} onChange={e => updateSetting("site_url", e.target.value)} placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select value={settings.currency || "BDT"} onValueChange={v => updateSetting("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT (৳)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={settings.timezone || "Asia/Dhaka"} onValueChange={v => updateSetting("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Transaction Status</Label>
                <Select value={settings.default_transaction_status || "pending"} onValueChange={v => updateSetting("default_transaction_status", v)}>
                  <SelectTrigger className="w-full md:w-1/2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending (Manual Approval)</SelectItem>
                    <SelectItem value="completed">Completed (Auto Approve)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If set to "Completed", payments will be auto-approved.</p>
              </div>
              <div className="space-y-2">
                <Label>Auto-Approve Threshold (Amount)</Label>
                <Input type="number" value={settings.auto_approve_threshold || ""} onChange={e => updateSetting("auto_approve_threshold", e.target.value)} placeholder="0 (disabled)" className="w-full md:w-1/2" />
                <p className="text-xs text-muted-foreground">Transactions below this amount will be auto-approved. Set 0 to disable.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <h4 className="font-medium text-foreground">Two-Factor Authentication (2FA)</h4>
                  <p className="text-sm text-muted-foreground mt-1">Require 2FA for admin login using Google Authenticator</p>
                </div>
                <Switch
                  checked={settings.two_factor_enabled === "true"}
                  onCheckedChange={v => updateSetting("two_factor_enabled", v ? "true" : "false")}
                />
              </div>
              {settings.two_factor_enabled === "true" && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label>2FA Method</Label>
                  <Select value={settings.two_factor_method || "totp"} onValueChange={v => updateSetting("two_factor_method", v)}>
                    <SelectTrigger className="w-full md:w-1/2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totp">Google Authenticator (TOTP)</SelectItem>
                      <SelectItem value="email">Email OTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Notification Email</Label>
                <Input value={settings.notification_email || ""} onChange={e => updateSetting("notification_email", e.target.value)} placeholder="admin@example.com" />
                <p className="text-xs text-muted-foreground">Email address to receive payment notifications</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <h4 className="font-medium text-foreground">Payment Notifications</h4>
                  <p className="text-sm text-muted-foreground">Get notified when a new payment is received</p>
                </div>
                <Switch checked={settings.notification_on_payment !== "false"} onCheckedChange={v => updateSetting("notification_on_payment", v ? "true" : "false")} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <h4 className="font-medium text-foreground">Refund Notifications</h4>
                  <p className="text-sm text-muted-foreground">Get notified when a refund is processed</p>
                </div>
                <Switch checked={settings.notification_on_refund !== "false"} onCheckedChange={v => updateSetting("notification_on_refund", v ? "true" : "false")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-destructive/5">
                <div>
                  <h4 className="font-medium text-foreground">Maintenance Mode</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    When enabled, all public-facing pages (checkout, payment links) will show a maintenance message.
                  </p>
                </div>
                <Switch
                  checked={settings.maintenance_mode === "true"}
                  onCheckedChange={v => updateSetting("maintenance_mode", v ? "true" : "false")}
                />
              </div>
              {settings.maintenance_mode === "true" && (
                <div className="space-y-2 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={settings.maintenance_message || ""}
                    onChange={e => updateSetting("maintenance_message", e.target.value)}
                    placeholder="We're currently performing scheduled maintenance. We'll be back shortly."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">This message will be shown to visitors during maintenance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
