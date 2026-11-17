import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGatewayBrand, GATEWAY_TEMPLATE_CONFIGS } from "@/lib/gateway-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Loader2, Trash2, ArrowLeft, HelpCircle, DollarSign, Percent, Type, Palette,
  CreditCard, Building2, Phone, Hash, Globe, Shield, Zap, FileText, QrCode, Key
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activity-logger";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";

const INITIAL_FORM = {
  displayName: "",
  minAmount: "0",
  maxAmount: "0",
  fixedCharge: "0",
  percentCharge: "0",
  fixedDiscount: "0",
  percentDiscount: "0",
  currency: "BDT",
  status: "active",
  gatewayGroup: "bank",
  gatewayMode: "live",
  primaryColor: "#1a56db",
  textColor: "#ffffff",
  btnColor: "#1a56db",
  btnTextColor: "#ffffff",
  mobileNumber: "",
  pendingPayment: "disable",
  description: "",
  hasQrCode: false,
  qrCodeUrl: "",
  dynamicParams: {} as Record<string, string>,
};

export default function GatewaySettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [hasChanges, setHasChanges] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  const updateForm = useCallback((updates: Partial<typeof INITIAL_FORM>) => {
    setForm(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const { data: gateway, isLoading } = useQuery({
    queryKey: ["gateway", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gateways")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Find matching template for this gateway
  const matchedTemplate = useMemo(() => {
    if (!gateway) return null;
    return GATEWAY_TEMPLATE_CONFIGS.find(t => 
      t.title.toLowerCase() === gateway.display_name.toLowerCase()
    ) || GATEWAY_TEMPLATE_CONFIGS.find(t =>
      t.gateway_type_hint === gateway.gateway_type && t.gateway_mode === gateway.gateway_mode
    ) || null;
  }, [gateway]);

  const templateFields = matchedTemplate?.fields || [];

  useEffect(() => {
    if (gateway) {
      const cfg = (gateway.config as any) || {};
      const params = (gateway.gateway_parameters as any) || {};
      
      // Build dynamicParams from stored gateway_parameters
      const dynamicParams: Record<string, string> = {};
      Object.keys(params).forEach(key => {
        dynamicParams[key] = String(params[key] || "");
      });

      setForm({
        displayName: gateway.display_name,
        minAmount: String(gateway.min_amount || 0),
        maxAmount: String(gateway.max_amount || 0),
        fixedCharge: String(gateway.fixed_charge || 0),
        percentCharge: String(gateway.percent_charge || 0),
        fixedDiscount: String(gateway.fixed_discount || 0),
        percentDiscount: String(gateway.percent_discount || 0),
        currency: gateway.currency || "BDT",
        status: gateway.is_active ? "active" : "inactive",
        gatewayGroup: gateway.gateway_group || "bank",
        gatewayMode: gateway.gateway_mode || "live",
        primaryColor: cfg.primary_color || "#1a56db",
        textColor: cfg.text_color || "#ffffff",
        btnColor: cfg.btn_color || "#1a56db",
        btnTextColor: cfg.btn_text_color || "#ffffff",
        mobileNumber: params.mobile_number || "",
        pendingPayment: params.pending_payment || "disable",
        description: gateway.description || "",
        hasQrCode: gateway.has_qr_code || false,
        qrCodeUrl: gateway.qr_code || "",
        dynamicParams,
      });
      setHasChanges(false);
    }
  }, [gateway]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build gateway_parameters from dynamicParams + legacy fields
      const gatewayParameters: any = { ...form.dynamicParams };
      if (form.mobileNumber) gatewayParameters.mobile_number = form.mobileNumber;
      gatewayParameters.pending_payment = form.pendingPayment;

      const payload = {
        display_name: form.displayName.trim(),
        min_amount: parseFloat(form.minAmount) || 0,
        max_amount: parseFloat(form.maxAmount) || 0,
        fixed_charge: parseFloat(form.fixedCharge) || 0,
        percent_charge: parseFloat(form.percentCharge) || 0,
        fixed_discount: parseFloat(form.fixedDiscount) || 0,
        percent_discount: parseFloat(form.percentDiscount) || 0,
        currency: form.currency,
        is_active: form.status === "active",
        gateway_group: form.gatewayGroup,
        gateway_mode: form.gatewayMode,
        description: form.description.trim() || null,
        has_qr_code: form.hasQrCode,
        qr_code: form.qrCodeUrl || null,
        gateway_parameters: gatewayParameters,
        config: {
          primary_color: form.primaryColor,
          text_color: form.textColor,
          btn_color: form.btnColor,
          btn_text_color: form.btnTextColor,
        },
      };

      const { error } = await supabase.from("gateways").update(payload).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gateway updated!");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["gateway", id] });
      queryClient.invalidateQueries({ queryKey: ["gateways", orgId] });
      if (orgId && user?.id) {
        logActivity({ action: "update", entityType: "gateway", entityId: id!, orgId, userId: user.id, brandId: gateway?.brand_id, details: { name: form.displayName } });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gateways").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gateway deleted!");
      queryClient.invalidateQueries({ queryKey: ["gateways", orgId] });
      if (orgId && user?.id) {
        logActivity({ action: "delete", entityType: "gateway", entityId: id!, orgId, userId: user.id, brandId: gateway?.brand_id });
      }
      navigate("/gateways");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatGatewayName = (type: string) =>
    type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (!gateway) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-muted-foreground">Gateway not found</p>
          <Button variant="outline" onClick={() => navigate("/gateways")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Gateways
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(() => {
              const brand = getGatewayBrand(gateway.gateway_type, gateway.display_name);
              const logoUrl = gateway.image_url || (gateway.gateway_type);
              return logoUrl ? (
                <img src={logoUrl} alt={gateway.display_name} className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
              ) : (
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: brand.bgColor, color: brand.textColor }}
                >
                  {brand.icon}
                </div>
              );
            })()}
            <div>
              <button
                onClick={() => navigate("/gateways")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Gateways
              </button>
              <h1 className="text-2xl font-bold tracking-tight">{gateway.display_name}</h1>
              <p className="text-sm text-muted-foreground">{formatGatewayName(gateway.gateway_type)}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Gateway</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{gateway.display_name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
          {/* Gateway Information */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Gateway Information
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingsField label="Gateway Type" helpText="The payment provider type" icon={<Shield className="h-3.5 w-3.5" />}>
                  <Input value={formatGatewayName(gateway.gateway_type)} readOnly className="h-9 bg-muted/50 text-muted-foreground" />
                </SettingsField>

                <SettingsField label="Display Name" helpText="The name shown to customers during checkout" icon={<Type className="h-3.5 w-3.5" />} required>
                  <Input className="h-9" required value={form.displayName} onChange={(e) => updateForm({ displayName: e.target.value })} placeholder="e.g. bKash Personal" />
                </SettingsField>

                <SettingsField label="Min Amount" helpText="Minimum transaction amount accepted by this gateway" icon={<DollarSign className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">{form.currency}</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.minAmount} onChange={(e) => updateForm({ minAmount: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Max Amount" helpText="Maximum transaction amount (0 = unlimited)" icon={<DollarSign className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">{form.currency}</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.maxAmount} onChange={(e) => updateForm({ maxAmount: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Fixed Charge" helpText="A flat fee applied per transaction" icon={<DollarSign className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">{form.currency}</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.fixedCharge} onChange={(e) => updateForm({ fixedCharge: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Percentage Charge" helpText="A percentage fee applied per transaction" icon={<Percent className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">%</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.percentCharge} onChange={(e) => updateForm({ percentCharge: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Fixed Discount" helpText="A flat discount applied per transaction" icon={<DollarSign className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">{form.currency}</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.fixedDiscount} onChange={(e) => updateForm({ fixedDiscount: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Percentage Discount" helpText="A percentage discount applied per transaction" icon={<Percent className="h-3.5 w-3.5" />} required>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-medium min-w-[40px] justify-center">%</span>
                    <Input className="rounded-l-none h-9" type="number" step="0.01" value={form.percentDiscount} onChange={(e) => updateForm({ percentDiscount: e.target.value })} required />
                  </div>
                </SettingsField>

                <SettingsField label="Currency" helpText="The currency used for transactions" icon={<Globe className="h-3.5 w-3.5" />} required>
                  <Select value={form.currency} onValueChange={(v) => updateForm({ currency: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["BDT", "USD", "EUR", "GBP", "INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SettingsField>

                <SettingsField label="Status" helpText="Whether this gateway is available for payments" icon={<Zap className="h-3.5 w-3.5" />} required>
                  <Select value={form.status} onValueChange={(v) => updateForm({ status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>

                <SettingsField label="Group" helpText="Gateway category (MFS, Bank, or Global)" icon={<Building2 className="h-3.5 w-3.5" />}>
                  <Select value={form.gatewayGroup} onValueChange={(v) => updateForm({ gatewayGroup: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mfs">MFS</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>

                <SettingsField label="Mode" helpText="Gateway operating mode" icon={<Shield className="h-3.5 w-3.5" />}>
                  <Select value={form.gatewayMode} onValueChange={(v) => updateForm({ gatewayMode: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["live", "manual", "personal", "merchant", "agent"].map(m => (
                        <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsField>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Configuration
                {matchedTemplate && (
                  <span className="text-xs font-normal text-muted-foreground ml-auto">
                    Template: {matchedTemplate.title}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dynamic template fields */}
                {templateFields.filter(f => f.type !== "image").map((field) => (
                  <SettingsField
                    key={field.name}
                    label={field.label}
                    helpText={`Enter ${field.label.toLowerCase()}`}
                    icon={<Key className="h-3.5 w-3.5" />}
                  >
                    {field.type === "select" ? (
                      <Select
                        value={form.dynamicParams[field.name] || "sandbox"}
                        onValueChange={(v) => updateForm({
                          dynamicParams: { ...form.dynamicParams, [field.name]: v }
                        })}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-9"
                        type={field.name.includes("password") || field.name.includes("secret") ? "password" : "text"}
                        value={form.dynamicParams[field.name] || ""}
                        onChange={(e) => updateForm({
                          dynamicParams: { ...form.dynamicParams, [field.name]: e.target.value }
                        })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                  </SettingsField>
                ))}

                {/* Common fields: Mobile Number (for MFS) */}
                {gateway?.gateway_group === "mfs" && (
                  <SettingsField label="Mobile Number" helpText="The mobile number for receiving payments" icon={<Phone className="h-3.5 w-3.5" />}>
                    <Input className="h-9" value={form.mobileNumber} onChange={(e) => updateForm({ mobileNumber: e.target.value })} placeholder="Enter mobile number" />
                  </SettingsField>
                )}

                {/* Allow Pending Payment */}
                <SettingsField label="Allow Pending Payment" helpText="Whether to accept payments that are pending verification" icon={<Shield className="h-3.5 w-3.5" />}>
                  <Select value={form.pendingPayment} onValueChange={(v) => updateForm({ pendingPayment: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>

                <div className="md:col-span-2">
                  <SettingsField label="Description" helpText="Optional description shown on the payment page" icon={<FileText className="h-3.5 w-3.5" />}>
                    <Textarea value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={3} placeholder="Optional description" className="text-sm" />
                  </SettingsField>
                </div>

                <div className="md:col-span-2">
                  <SettingsField label="QR Code" helpText="Enable QR code display for this gateway" icon={<QrCode className="h-3.5 w-3.5" />}>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={form.hasQrCode} onCheckedChange={(v) => updateForm({ hasQrCode: v })} />
                      <span className="text-xs text-muted-foreground">{form.hasQrCode ? "Enabled" : "Disabled"}</span>
                    </div>
                    {form.hasQrCode && (
                      <div className="mt-3 space-y-2">
                        {form.qrCodeUrl && (
                          <div className="relative inline-block">
                            <img src={form.qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain rounded-lg border" />
                            <button type="button" onClick={() => updateForm({ qrCodeUrl: "" })}
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs">×</button>
                          </div>
                        )}
                        <div>
                          <label className="flex items-center justify-center gap-2 w-full px-3 py-3 cursor-pointer text-sm rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-colors">
                            {qrUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                            {qrUploading ? "Uploading..." : (form.qrCodeUrl ? "Change QR Image" : "Upload QR Image")}
                            <input type="file" accept="image/*" className="hidden" disabled={qrUploading} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !id) return;
                              setQrUploading(true);
                              try {
                                const ext = file.name.split('.').pop();
                                const path = `qr/${id}.${ext}`;
                                const { error: upErr } = await supabase.storage.from("gateway-assets").upload(path, file, { upsert: true, cacheControl: '0' });
                                if (upErr) throw upErr;
                                const { data: urlData } = supabase.storage.from("gateway-assets").getPublicUrl(path);
                                updateForm({ qrCodeUrl: `${urlData.publicUrl}?t=${Date.now()}` });
                                toast.success("QR image uploaded!");
                              } catch (err: any) {
                                toast.error(err.message || "Upload failed");
                              } finally {
                                setQrUploading(false);
                              }
                            }} />
                          </label>
                        </div>
                      </div>
                    )}
                  </SettingsField>
                </div>

                {/* Show message if no template fields */}
                {templateFields.length === 0 && gateway?.gateway_group !== "mfs" && (
                  <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                    No additional configuration fields required for this gateway type.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Colors
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SettingsField label="Primary Color" helpText="Main brand color used on the payment page" icon={<Palette className="h-3.5 w-3.5" />}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primaryColor} onChange={(e) => updateForm({ primaryColor: e.target.value })} className="h-9 w-9 rounded border border-input cursor-pointer" />
                    <Input className="h-9 text-xs flex-1 font-mono" value={form.primaryColor} onChange={(e) => updateForm({ primaryColor: e.target.value })} />
                  </div>
                </SettingsField>
                <SettingsField label="Text Color" helpText="Text color on the payment page" icon={<Type className="h-3.5 w-3.5" />}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.textColor} onChange={(e) => updateForm({ textColor: e.target.value })} className="h-9 w-9 rounded border border-input cursor-pointer" />
                    <Input className="h-9 text-xs flex-1 font-mono" value={form.textColor} onChange={(e) => updateForm({ textColor: e.target.value })} />
                  </div>
                </SettingsField>
                <SettingsField label="Button Color" helpText="Color of the pay button" icon={<Palette className="h-3.5 w-3.5" />}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.btnColor} onChange={(e) => updateForm({ btnColor: e.target.value })} className="h-9 w-9 rounded border border-input cursor-pointer" />
                    <Input className="h-9 text-xs flex-1 font-mono" value={form.btnColor} onChange={(e) => updateForm({ btnColor: e.target.value })} />
                  </div>
                </SettingsField>
                <SettingsField label="Btn Text Color" helpText="Text color on the pay button" icon={<Type className="h-3.5 w-3.5" />}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.btnTextColor} onChange={(e) => updateForm({ btnTextColor: e.target.value })} className="h-9 w-9 rounded border border-input cursor-pointer" />
                    <Input className="h-9 text-xs flex-1 font-mono" value={form.btnTextColor} onChange={(e) => updateForm({ btnTextColor: e.target.value })} />
                  </div>
                </SettingsField>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={saveMutation.isPending || !hasChanges}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
            ) : "Save changes"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

// --- Settings Field with label, icon, and help tooltip ---
function SettingsField({ label, helpText, icon, required, children }: {
  label: string;
  helpText: string;
  icon: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <Label className="text-xs">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {helpText}
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}
