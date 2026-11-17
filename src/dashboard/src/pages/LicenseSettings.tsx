import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Save, Loader2, Settings } from "lucide-react";

export default function LicenseSettings() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [regularPrice, setRegularPrice] = useState("49");
  const [premiumPrice, setPremiumPrice] = useState("149");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultExpiryDays, setDefaultExpiryDays] = useState("365");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (!currentOrg) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("license_settings")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      if (data) {
        setRegularPrice(String(data.regular_price));
        setPremiumPrice(String(data.premium_price));
        setDefaultCurrency(data.default_currency);
        setDefaultExpiryDays(String(data.default_expiry_days));
        setWebhookUrl(data.webhook_url || "");
      }
      setLoading(false);
    })();
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: currentOrg.id,
        regular_price: parseFloat(regularPrice),
        premium_price: parseFloat(premiumPrice),
        default_currency: defaultCurrency,
        default_expiry_days: parseInt(defaultExpiryDays),
        webhook_url: webhookUrl || null,
      };

      const { data: existing } = await supabase
        .from("license_settings")
        .select("id")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("license_settings")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("license_settings")
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: "সেটিংস সেভ হয়েছে" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">License Settings</h1>
          <p className="text-muted-foreground text-sm">লাইসেন্স প্রাইসিং ও কনফিগারেশন</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
              <CardDescription>লাইসেন্স টাইপ অনুযায়ী মূল্য নির্ধারণ করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Regular License Price</Label>
                <Input type="number" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Premium License Price</Label>
                <Input type="number" value={premiumPrice} onChange={e => setPremiumPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Input value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} placeholder="USD" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>ডিফল্ট সেটিংস</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Expiry (days)</Label>
                <Input type="number" value={defaultExpiryDays} onChange={e => setDefaultExpiryDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Webhook URL</Label>
                <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">পেমেন্ট কনফার্মেশনের জন্য ওয়েবহুক URL</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
