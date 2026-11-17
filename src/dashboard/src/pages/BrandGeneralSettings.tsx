import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Upload, X, Star, Eye } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CheckoutPreview, { type CheckoutPreviewProps } from "@/components/CheckoutPreview";

type Brand = Tables<"brands">;

const DEFAULT_PREVIEW_THEME: CheckoutPreviewProps["theme"] = {
  border_radius: "13",
  card_shadow: "sm",
  font_family: "DM Sans",
  bg_color: "#f5f6f9",
  card_bg_color: "#ffffff",
  text_color: "#111827",
  muted_color: "#9ca3af",
  border_color: "#e5e7eb",
  accent_color: "#1a56db",
  button_style: "filled",
  button_radius: "8",
  show_order_details: "true",
  show_powered_by: "true",
  header_style: "inline",
  gateway_columns: "classic",
  show_gateway_names: "enabled",
  watermark_text: "",
  footer_links: "",
  show_nav_buttons: "all",
  pl_button_text: "",
};

export default function BrandGeneralSettings() {
  const { currentOrg } = useOrg();
  const { activeBrand: contextBrand } = useBrand();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<CheckoutPreviewProps["theme"]>({ ...DEFAULT_PREVIEW_THEME });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contextBrand) {
      setBrand(contextBrand);
      setName(contextBrand.name);
      setPrimaryColor(contextBrand.primary_color || "#6366f1");
      setSecondaryColor(contextBrand.secondary_color || "#8b5cf6");
      setDomain(contextBrand.domain || "");
      setLogoUrl(contextBrand.logo_url);
      setIsDefault(contextBrand.is_default);
      setLoading(false);
      loadThemeSettings(contextBrand.id);
    } else if (currentOrg) {
      setLoading(false);
    }
  }, [contextBrand, currentOrg]);

  const loadThemeSettings = async (brandId: string) => {
    if (!currentOrg) return;
    const { data: settings } = await supabase
      .from("theme_settings")
      .select("name, value")
      .eq("organization_id", currentOrg.id)
      .eq("brand_id", brandId);

    if (settings && settings.length > 0) {
      const loaded = { ...DEFAULT_PREVIEW_THEME };
      settings.forEach((s) => {
        if (s.name in loaded) (loaded as any)[s.name] = s.value || (DEFAULT_PREVIEW_THEME as any)[s.name];
      });
      setPreviewTheme(loaded);
    }
  };

  // Sync accent_color with primaryColor changes
  useEffect(() => {
    setPreviewTheme((prev) => ({ ...prev, accent_color: primaryColor }));
  }, [primaryColor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brand) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${currentOrg!.id}/${brand.id}.${ext}`;

    const { error } = await supabase.storage
      .from("brand-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Logo upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("brand-logos")
      .getPublicUrl(path);

    setLogoUrl(urlData.publicUrl + "?t=" + Date.now());
    setUploading(false);
    toast.success("Logo uploaded!");
  };

  const handleSave = async () => {
    if (!brand) return;
    setSaving(true);

    if (isDefault && !brand.is_default) {
      await supabase
        .from("brands")
        .update({ is_default: false })
        .eq("organization_id", currentOrg!.id)
        .neq("id", brand.id);
    }

    const { error } = await supabase
      .from("brands")
      .update({
        name: name.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        domain: domain.trim() || null,
        logo_url: logoUrl,
        is_default: isDefault,
      })
      .eq("id", brand.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Brand settings saved!");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Brand Settings</p>
        <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !brand ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No brand found. Please create a brand first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input
                    id="brand-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Brand"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-domain">Domain</Label>
                  <Input
                    id="brand-domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="pay.example.com"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Default Brand (Checkout)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      এই ব্র্যান্ডটি চেকআউট পেজে ডিফল্ট হিসেবে দেখাবে
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDefault(!isDefault)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isDefault ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${isDefault ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        id="primary-color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        id="secondary-color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Brand Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted">
                        <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain" />
                        <button
                          onClick={() => setLogoUrl(null)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CheckoutPreview
                  brandName={name || "Brand Name"}
                  brandLogo={logoUrl}
                  theme={previewTheme}
                />
              </CardContent>
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground text-center">
                  Checkout page preview — reflects brand & theme settings
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
