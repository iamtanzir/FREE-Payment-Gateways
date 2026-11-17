import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Facebook, Globe, Mail, Phone, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { toast } from "sonner";

const SUPPORT_FIELDS = [
  { key: "support_whatsapp", label: "WhatsApp Number", icon: MessageCircle, placeholder: "+8801XXXXXXXXX", color: "#25D366" },
  { key: "support_telegram", label: "Telegram Link", icon: Send, placeholder: "https://t.me/username", color: "#229ED9" },
  { key: "support_messenger", label: "Messenger Link", icon: Facebook, placeholder: "https://m.me/pagename", color: "#0078FF" },
  { key: "support_website", label: "Website URL", icon: Globe, placeholder: "https://example.com", color: "#7c3aed" },
  { key: "support_email", label: "Email Address", icon: Mail, placeholder: "support@example.com", color: "#dc2626" },
  { key: "support_phone", label: "Phone Number", icon: Phone, placeholder: "+8801XXXXXXXXX", color: "#16a34a" },
];

export default function SupportSettings() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrg && activeBrandId) loadSettings();
  }, [currentOrg, activeBrandId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brand_settings")
      .select("name, value")
      .eq("organization_id", currentOrg!.id)
      .eq("brand_id", activeBrandId!)
      .in("name", SUPPORT_FIELDS.map((f) => f.key));

    const map: Record<string, string> = {};
    data?.forEach((s) => { if (s.value) map[s.name] = s.value; });
    setValues(map);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentOrg || !activeBrandId) return;
    setSaving(true);

    for (const field of SUPPORT_FIELDS) {
      const val = values[field.key]?.trim() || null;

      const { data: existing } = await supabase
        .from("brand_settings")
        .select("id")
        .eq("organization_id", currentOrg.id)
        .eq("brand_id", activeBrandId)
        .eq("name", field.key)
        .maybeSingle();

      if (existing) {
        await supabase.from("brand_settings").update({ value: val }).eq("id", existing.id);
      } else if (val) {
        await supabase.from("brand_settings").insert({
          organization_id: currentOrg.id,
          brand_id: activeBrandId,
          name: field.key,
          value: val,
        });
      }
    }

    toast.success("Support settings saved!");
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Brand Settings</p>
        <h1 className="text-2xl font-bold text-foreground">Support Contact Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Channels</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure contact links shown on the checkout support tab for the selected brand.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {SUPPORT_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
                    style={{ background: field.color }}
                  >
                    <field.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={field.key} className="text-sm font-medium">{field.label}</Label>
                    <Input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Support Settings"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
