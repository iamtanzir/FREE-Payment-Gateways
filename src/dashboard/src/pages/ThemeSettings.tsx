import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Save, RotateCcw, Eye, X, ChevronDown, Upload, MessageCircle, Check } from "lucide-react";
import CheckoutPreview from "@/components/CheckoutPreview";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { toast } from "sonner";

interface ThemeConfig {
  // Layout
  border_radius: string;
  card_shadow: string;
  // Typography
  font_family: string;
  // Colors
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  muted_color: string;
  border_color: string;
  accent_color: string;
  // Button
  button_style: string;
  button_radius: string;
  // Features
  show_order_details: string;
  show_powered_by: string;
  // Header
  header_style: string;
  // Gateway Display (from source class.php)
  gateway_columns: string;
  show_gateway_names: string;
  gateway_order_mfs: string;
  gateway_order_bank: string;
  gateway_order_global: string;
  // Footer (from source)
  watermark_text: string;
  footer_links: string;
  // Navigation
  show_nav_buttons: string;
  support_columns: string;
  // Post-Payment Redirect
  redirect_after_payment: string;
  redirect_delay: string;
  // Payment Link
  pl_show_image: string;
  pl_show_description: string;
  pl_button_text: string;
  pl_notice_text: string;
  // SEO & Analytics
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  analytics_code: string;
  // Terms & Conditions
  terms_conditions: string;
}

const DEFAULT_THEME: ThemeConfig = {
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
  gateway_order_mfs: "",
  gateway_order_bank: "",
  gateway_order_global: "",
  watermark_text: "",
  footer_links: "",
  show_nav_buttons: "all",
  support_columns: "1",
  redirect_after_payment: "enabled",
  redirect_delay: "5",
  pl_show_image: "enabled",
  pl_show_description: "enabled",
  pl_button_text: "",
  pl_notice_text: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  analytics_code: "",
  terms_conditions: "",
};

const FONT_OPTIONS = [
  "DM Sans", "Inter", "Poppins", "Roboto", "Nunito", "Open Sans", "Lato", "Montserrat",
];

const SHADOW_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

interface ThemePreset {
  name: string;
  description: string;
  theme: Partial<ThemeConfig>;
  preview: { bg: string; card: string; accent: string; text: string };
}

const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Light",
    description: "Clean & minimal white theme",
    theme: {
      bg_color: "#f5f6f9", card_bg_color: "#ffffff", text_color: "#111827",
      muted_color: "#9ca3af", border_color: "#e5e7eb", accent_color: "#1a56db",
      border_radius: "13", card_shadow: "sm", font_family: "DM Sans",
      button_style: "filled", button_radius: "8",
      show_order_details: "true", show_powered_by: "true", header_style: "inline",
    },
    preview: { bg: "#f5f6f9", card: "#ffffff", accent: "#1a56db", text: "#111827" },
  },
  {
    name: "Dark",
    description: "Elegant dark mode",
    theme: {
      bg_color: "#0f172a", card_bg_color: "#1e293b", text_color: "#f1f5f9",
      muted_color: "#64748b", border_color: "#334155", accent_color: "#6366f1",
      border_radius: "12", card_shadow: "md", font_family: "Inter",
      button_style: "gradient", button_radius: "10",
      show_order_details: "true", show_powered_by: "true", header_style: "inline",
    },
    preview: { bg: "#0f172a", card: "#1e293b", accent: "#6366f1", text: "#f1f5f9" },
  },
  {
    name: "Colorful",
    description: "Vibrant & playful theme",
    theme: {
      bg_color: "#faf5ff", card_bg_color: "#ffffff", text_color: "#1e1b4b",
      muted_color: "#a78bfa", border_color: "#e9d5ff", accent_color: "#7c3aed",
      border_radius: "16", card_shadow: "md", font_family: "Poppins",
      button_style: "gradient", button_radius: "12",
      show_order_details: "true", show_powered_by: "true", header_style: "centered",
    },
    preview: { bg: "#faf5ff", card: "#ffffff", accent: "#7c3aed", text: "#1e1b4b" },
  },
  {
    name: "Nature",
    description: "Earth-tone green theme",
    theme: {
      bg_color: "#f0fdf4", card_bg_color: "#ffffff", text_color: "#14532d",
      muted_color: "#86efac", border_color: "#bbf7d0", accent_color: "#16a34a",
      border_radius: "10", card_shadow: "sm", font_family: "Nunito",
      button_style: "filled", button_radius: "6",
      show_order_details: "true", show_powered_by: "true", header_style: "inline",
    },
    preview: { bg: "#f0fdf4", card: "#ffffff", accent: "#16a34a", text: "#14532d" },
  },
  {
    name: "Sunset",
    description: "Warm orange tone",
    theme: {
      bg_color: "#fff7ed", card_bg_color: "#ffffff", text_color: "#7c2d12",
      muted_color: "#fdba74", border_color: "#fed7aa", accent_color: "#ea580c",
      border_radius: "14", card_shadow: "sm", font_family: "Roboto",
      button_style: "filled", button_radius: "8",
      show_order_details: "true", show_powered_by: "true", header_style: "inline",
    },
    preview: { bg: "#fff7ed", card: "#ffffff", accent: "#ea580c", text: "#7c2d12" },
  },
];

export default function ThemeSettings() {
  const { currentOrg } = useOrg();
  const { activeBrand: contextBrand } = useBrand();
  const [theme, setTheme] = useState<ThemeConfig>({ ...DEFAULT_THEME });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("Payment");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1a56db");
  const [activeSection, setActiveSection] = useState("appearance");

  useEffect(() => {
    if (currentOrg && contextBrand) loadTheme();
  }, [currentOrg, contextBrand?.id]);

  const loadTheme = async () => {
    if (!contextBrand) return;
    setBrandName(contextBrand.name);
    setBrandLogo(contextBrand.logo_url);
    setPrimaryColor(contextBrand.primary_color || "#1a56db");

    const { data: settings } = await supabase
      .from("theme_settings").select("name, value")
      .eq("organization_id", currentOrg!.id).eq("brand_id", contextBrand.id);

    if (settings && settings.length > 0) {
      const loaded = { ...DEFAULT_THEME };
      settings.forEach((s) => {
        if (s.name in loaded) (loaded as any)[s.name] = s.value || (DEFAULT_THEME as any)[s.name];
      });
      setTheme(loaded);
    } else {
      setTheme({ ...DEFAULT_THEME });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandId = contextBrand?.id;
      if (!brandId) { toast.error("No brand found"); setSaving(false); return; }

      for (const [name, value] of Object.entries(theme)) {
        const { data: existing } = await supabase.from("theme_settings")
          .select("id").eq("organization_id", currentOrg!.id)
          .eq("brand_id", brandId).eq("name", name).maybeSingle();

        if (existing) {
          await supabase.from("theme_settings").update({ value }).eq("id", existing.id);
        } else {
          await supabase.from("theme_settings").insert({
            organization_id: currentOrg!.id, brand_id: brandId, name, value,
          });
        }
      }
      toast.success("Theme settings saved!");
    } catch (err) {
      console.error(err); toast.error("Failed to save theme");
    } finally { setSaving(false); }
  };

  const handleReset = () => { setTheme({ ...DEFAULT_THEME }); toast.info("Reset to defaults"); };
  const updateTheme = (key: keyof ThemeConfig, value: string) => setTheme(prev => ({ ...prev, [key]: value }));

  const getShadowStyle = (s: string) => {
    if (s === "none") return "none"; if (s === "md") return "0 4px 6px -1px rgba(0,0,0,0.1)";
    if (s === "lg") return "0 10px 15px -3px rgba(0,0,0,0.1)"; return "0 1px 2px rgba(0,0,0,0.05)";
  };

  const SECTIONS = [
    { id: "appearance", label: "Appearance" },
    { id: "gateway", label: "Gateway Display" },
    { id: "footer", label: "Footer" },
    { id: "navigation", label: "Navigation" },
    { id: "redirect", label: "Redirect" },
    { id: "payment_link", label: "Payment Link" },
    { id: "terms", label: "Terms & Conditions" },
    { id: "seo", label: "SEO & Analytics" },
  ];

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
          <p className="text-sm text-muted-foreground">Brand Settings / Themes</p>
          <h1 className="text-2xl font-bold text-foreground">Checkout Theme</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${activeSection === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* ===== APPEARANCE ===== */}
          {activeSection === "appearance" && (
            <>
              {/* Theme Presets */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Quick Presets</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button key={preset.name}
                        onClick={() => { setTheme(prev => ({ ...prev, ...preset.theme })); toast.info(`"${preset.name}" preset applied`); }}
                        className="group relative rounded-lg border border-border p-2.5 text-left hover:shadow-md transition-all hover:border-primary/40">
                        <div className="rounded-md overflow-hidden mb-2 h-[52px] flex flex-col" style={{ background: preset.preview.bg }}>
                          <div className="flex items-center gap-1 px-2 pt-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: preset.preview.accent }} />
                            <div className="h-1.5 rounded-full flex-1" style={{ background: preset.preview.text, opacity: 0.2 }} />
                          </div>
                          <div className="flex-1 mx-2 my-1.5 rounded-sm" style={{ background: preset.preview.card, border: `1px solid ${preset.preview.accent}22` }}>
                            <div className="flex items-center gap-1 p-1.5">
                              <div className="h-1.5 w-6 rounded-full" style={{ background: preset.preview.accent }} />
                              <div className="h-1.5 w-4 rounded-full" style={{ background: preset.preview.text, opacity: 0.15 }} />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{preset.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Colors</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "bg_color" as const, label: "Background" },
                      { key: "card_bg_color" as const, label: "Card Background" },
                      { key: "text_color" as const, label: "Text Color" },
                      { key: "accent_color" as const, label: "Accent Color" },
                      { key: "muted_color" as const, label: "Muted Color" },
                      { key: "border_color" as const, label: "Border Color" },
                    ].map(c => (
                      <div key={c.key}>
                        <Label className="text-xs">{c.label}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" value={theme[c.key]} onChange={e => updateTheme(c.key, e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                          <Input value={theme[c.key]} onChange={e => updateTheme(c.key, e.target.value)} className="h-8 text-xs font-mono" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Typography & Layout */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Typography & Layout</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select value={theme.font_family} onValueChange={v => updateTheme("font_family", v)}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Card Border Radius: {theme.border_radius}px</Label>
                    <Slider value={[parseInt(theme.border_radius)]} onValueChange={([v]) => updateTheme("border_radius", String(v))} min={0} max={24} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Card Shadow</Label>
                    <Select value={theme.card_shadow} onValueChange={v => updateTheme("card_shadow", v)}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SHADOW_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Header Style</Label>
                    <Select value={theme.header_style} onValueChange={v => updateTheme("header_style", v)}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inline">Inline</SelectItem>
                        <SelectItem value="centered">Centered</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Button Style */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Button Style</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Style</Label>
                    <Select value={theme.button_style} onValueChange={v => updateTheme("button_style", v)}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filled">Filled</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Button Radius: {theme.button_radius}px</Label>
                    <Slider value={[parseInt(theme.button_radius)]} onValueChange={([v]) => updateTheme("button_radius", String(v))} min={0} max={24} step={1} className="mt-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Features</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Order Details</Label>
                    <Switch checked={theme.show_order_details === "true"} onCheckedChange={v => updateTheme("show_order_details", String(v))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show "Powered by" Footer</Label>
                    <Switch checked={theme.show_powered_by === "true"} onCheckedChange={v => updateTheme("show_powered_by", String(v))} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== GATEWAY DISPLAY ===== */}
          {activeSection === "gateway" && (
            <>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Gateway Display</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs mb-2 block">Gateway Layout Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "classic", label: "Classic", desc: "2-col grid, logo only" },
                        { value: "compact", label: "Compact", desc: "List rows with name" },
                        { value: "card", label: "Card Grid", desc: "3-col with name & bg" },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => updateTheme("gateway_columns", opt.value)}
                          className={`relative p-2 rounded-lg border-2 transition-all text-left ${theme.gateway_columns === opt.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-muted-foreground/30"}`}>
                          {/* Mini preview */}
                          <div className="mb-1.5">
                            {opt.value === "classic" && (
                              <div className="grid grid-cols-2 gap-1">
                                {[1,2,3,4].map(i => <div key={i} className="h-4 rounded bg-muted border border-border" />)}
                              </div>
                            )}
                            {opt.value === "compact" && (
                              <div className="space-y-1">
                                {[1,2,3].map(i => <div key={i} className="h-3 rounded bg-muted border border-border flex items-center"><div className="w-2.5 h-2 rounded-sm bg-primary/30 ml-0.5 mr-1" /><div className="flex-1 h-1.5 rounded bg-muted-foreground/20" /></div>)}
                              </div>
                            )}
                            {opt.value === "card" && (
                              <div className="grid grid-cols-3 gap-0.5">
                                {[1,2,3].map(i => <div key={i} className="h-5 rounded bg-muted border border-border flex flex-col items-center justify-center"><div className="w-2 h-2 rounded-sm bg-primary/30" /><div className="w-3 h-0.5 rounded bg-muted-foreground/20 mt-0.5" /></div>)}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-foreground leading-tight">{opt.label}</p>
                          <p className="text-[8px] text-muted-foreground leading-tight">{opt.desc}</p>
                          {theme.gateway_columns === opt.value && (
                            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2 h-2 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Show Gateway Names</Label>
                    <Select value={theme.show_gateway_names} onValueChange={v => updateTheme("show_gateway_names", v)}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Show Names Under Logo</SelectItem>
                        <SelectItem value="disabled">Hide Names (Logo Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Gateway Display Order</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Mobile Banking — Display Order</Label>
                    <Textarea value={theme.gateway_order_mfs} onChange={e => updateTheme("gateway_order_mfs", e.target.value)}
                      placeholder={"Gateway names one per line:\nbkash\nnagad\nrocket"} className="mt-1 text-xs h-20" />
                  </div>
                  <div>
                    <Label className="text-xs">Net Banking — Display Order</Label>
                    <Textarea value={theme.gateway_order_bank} onChange={e => updateTheme("gateway_order_bank", e.target.value)}
                      placeholder={"Gateway names one per line:\nsslcommerz\naamarpay"} className="mt-1 text-xs h-20" />
                  </div>
                  <div>
                    <Label className="text-xs">International — Display Order</Label>
                    <Textarea value={theme.gateway_order_global} onChange={e => updateTheme("gateway_order_global", e.target.value)}
                      placeholder={"Gateway names one per line:\nstripe\npaypal\nbinance"} className="mt-1 text-xs h-20" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== FOOTER ===== */}
          {activeSection === "footer" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Footer Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Footer Branding Text</Label>
                  <Input value={theme.watermark_text} onChange={e => updateTheme("watermark_text", e.target.value)}
                    placeholder="e.g. Secured by YourBrand" className="h-9 mt-1 text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use brand name</p>
                </div>
                <div>
                  <Label className="text-xs">Footer Linked Text (HTML)</Label>
                  <Textarea value={theme.footer_links} onChange={e => updateTheme("footer_links", e.target.value)}
                    placeholder={'Powered by <a href="https://yourbrand.com" target="_blank">YourBrand</a>'} className="mt-1 text-xs h-20" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== NAVIGATION ===== */}
          {activeSection === "navigation" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Navigation & Support</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Show Nav Info Buttons</Label>
                  <Select value={theme.show_nav_buttons} onValueChange={v => updateTheme("show_nav_buttons", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All (Details, FAQ, Support)</SelectItem>
                      <SelectItem value="details">Details Only</SelectItem>
                      <SelectItem value="faq">FAQ Only</SelectItem>
                      <SelectItem value="support">Support Only</SelectItem>
                      <SelectItem value="disabled">Hide All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Support Items Per Row</Label>
                  <Select value={theme.support_columns} onValueChange={v => updateTheme("support_columns", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 per row (full-width)</SelectItem>
                      <SelectItem value="2">2 per row (grid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== REDIRECT ===== */}
          {activeSection === "redirect" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Post-Payment Redirect</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Auto-Redirect After Payment</Label>
                  <Select value={theme.redirect_after_payment} onValueChange={v => updateTheme("redirect_after_payment", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled — redirect automatically</SelectItem>
                      <SelectItem value="disabled">Disabled — show result page only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Auto-Redirect Delay (seconds)</Label>
                  <Select value={theme.redirect_delay} onValueChange={v => updateTheme("redirect_delay", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 seconds</SelectItem>
                      <SelectItem value="5">5 seconds (Default)</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== PAYMENT LINK ===== */}
          {activeSection === "payment_link" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Payment Link Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Show Product Image</Label>
                  <Select value={theme.pl_show_image} onValueChange={v => updateTheme("pl_show_image", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Show Image</SelectItem>
                      <SelectItem value="disabled">Hide Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Show Description</Label>
                  <Select value={theme.pl_show_description} onValueChange={v => updateTheme("pl_show_description", v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Show Description</SelectItem>
                      <SelectItem value="disabled">Hide Description</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Pay Button Text</Label>
                  <Input value={theme.pl_button_text} onChange={e => updateTheme("pl_button_text", e.target.value)}
                    placeholder="Default: Pay Now — e.g. Buy Now, Donate" className="h-9 mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Notice / Terms Text</Label>
                  <Textarea value={theme.pl_notice_text} onChange={e => updateTheme("pl_notice_text", e.target.value)}
                    placeholder="Optional notice shown below the pay button" className="mt-1 text-xs h-20" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== TERMS & CONDITIONS ===== */}
          {activeSection === "terms" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Terms & Conditions Content</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">
                    This content will be shown in a popup when users click "Terms and Conditions" on the checkout page. HTML is supported.
                  </p>
                  <Textarea value={theme.terms_conditions} onChange={e => updateTheme("terms_conditions", e.target.value)}
                    placeholder={"Enter your terms and conditions here...\n\nExample:\n1. Payment Processing: We act as a payment facilitator...\n2. Refund Policy: Refund requests are subject to review...\n3. Privacy: Your information is protected..."}
                    className="mt-1 text-xs h-64 font-mono" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Leave empty to show default generic terms on checkout.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ===== SEO & ANALYTICS ===== */}
          {activeSection === "seo" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">SEO & Analytics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">SEO Title</Label>
                  <Input value={theme.seo_title} onChange={e => updateTheme("seo_title", e.target.value)}
                    placeholder="Enter SEO title (max 60 characters)" className="h-9 mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">SEO Description</Label>
                  <Textarea value={theme.seo_description} onChange={e => updateTheme("seo_description", e.target.value)}
                    placeholder="Enter SEO description (max 160 characters)" className="mt-1 text-xs h-16" />
                </div>
                <div>
                  <Label className="text-xs">SEO Keywords</Label>
                  <Input value={theme.seo_keywords} onChange={e => updateTheme("seo_keywords", e.target.value)}
                    placeholder="e.g. billing, payments, checkout" className="h-9 mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Analytics & Tracking Code</Label>
                  <Textarea value={theme.analytics_code} onChange={e => updateTheme("analytics_code", e.target.value)}
                    placeholder="Paste Google Analytics, GTM, or tracking code" className="mt-1 text-xs h-24 font-mono" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CheckoutPreview
                brandName={brandName}
                brandLogo={brandLogo}
                theme={theme}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
