import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Home, HelpCircle, Headphones, Info, ChevronDown, ChevronUp, Copy, Check, Upload, ShieldCheck, MessageCircle, Send, Facebook, Globe, Mail, Phone, Languages, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { getGatewayLangText, getGatewayBrand, type GatewayLangText } from "@/lib/gateway-brands";
import { resolveCheckoutBrand } from "@/lib/checkout-brand";

// ─── Types ────────────────────────────────────────────
interface Transaction {
  id: string; reference: string; amount: number; currency: string;
  status: string; metadata: any; organization_id: string; gateway_id: string | null; created_at: string;
  payment_link_id: string | null;
}
interface Gateway {
  id: string; display_name: string; gateway_type: string; gateway_group: string;
  image_url: string | null; is_active: boolean; min_amount: number; max_amount: number;
  fixed_charge: number; percent_charge: number; fixed_discount: number; percent_discount: number;
  gateway_parameters: any; config: any; has_qr_code: boolean; qr_code: string | null;
  currency: string;
}
interface CurrencyRate { code: string; exchange_rate: number; symbol: string; }
interface Faq { id: string; title: string; content: string; }
interface Brand { id: string; name: string; logo_url: string | null; primary_color: string | null; }
interface ThemeCfg {
  bg_color: string; card_bg_color: string; text_color: string; muted_color: string;
  border_color: string; accent_color: string; border_radius: string; card_shadow: string;
  font_family: string; button_style: string; button_radius: string;
  show_order_details: string; show_powered_by: string; header_style: string;
  gateway_columns: string; show_gateway_names: string;
  show_nav_buttons: string; watermark_text: string; footer_links: string;
}

const DEFAULTS: ThemeCfg = {
  bg_color:"#f5f6f9", card_bg_color:"#ffffff", text_color:"#111827", muted_color:"#9ca3af",
  border_color:"#e5e7eb", accent_color:"#1a56db", border_radius:"13", card_shadow:"sm",
  font_family:"DM Sans", button_style:"filled", button_radius:"8",
  show_order_details:"true", show_powered_by:"true", header_style:"inline", gateway_columns:"classic",
  show_gateway_names:"enabled", show_nav_buttons:"all", watermark_text:"", footer_links:"",
};

// Light mode colors — always used on checkout regardless of DB theme
const LIGHT_COLORS = {
  bg_color:"#f5f6f9", card_bg_color:"#ffffff", text_color:"#111827", muted_color:"#9ca3af",
  border_color:"#e5e7eb",
};

const shadow = (s:string) => {
  if(s==="none") return "none";
  if(s==="md") return "0 4px 6px -1px rgba(0,0,0,0.1)";
  if(s==="lg") return "0 10px 15px -3px rgba(0,0,0,0.1)";
  return "0 1px 2px rgba(0,0,0,0.05)";
};

const hexToLt = (hex:string) => hex + "18";

// Gateway-specific instructions (fallback — templates have lang_text now)
// Instructions split: [beforeAccount, afterAmount] — account & amount are rendered as hardcoded blocks in between
const GW_INSTRUCTIONS: Record<string, (mobile:string, amount:string, currency:string)=>{before:string[], after:string[]}> = {
  bkash: () => ({
    before: [`Go to your BKASH Mobile Menu by dialing *247# or Open BKASH App`, `Choose "Send Money"`],
    after: [`Now enter your BKASH Mobile Menu PIN to confirm`, `Done! You will receive a confirmation message from BKASH`],
  }),
  nagad: () => ({
    before: [`Go to your NAGAD Mobile Menu by dialing *167# or Open NAGAD App`, `Choose "Send Money"`],
    after: [`Now enter your NAGAD Mobile Menu PIN to confirm`, `Done! You will receive a confirmation message from NAGAD`],
  }),
  rocket: () => ({
    before: [`Go to your ROCKET Mobile Menu by dialing *322# or Open ROCKET App`, `Choose "Send Money"`],
    after: [`Now enter your ROCKET Mobile Menu PIN to confirm`, `Done! You will receive a confirmation message from ROCKET`],
  }),
  bank_transfer: (m,a,c) => ({
    before: [`Log in to your bank app or iBanking`, `Choose "Fund Transfer"`],
    after: [`Complete transfer and note reference`],
  }),
  crypto: (m,a,c) => ({
    before: [`Open your crypto wallet`],
    after: [`Wait for network confirmation`, `Copy the transaction hash`],
  }),
};

const TAB_LABELS_EN: Record<string, string> = {
  mfs: "Mobile Banking",
  bank: "Bank Transfer",
  global: "Global",
};
const TAB_LABELS_BN: Record<string, string> = {
  mfs: "মোবাইল ব্যাংকিং",
  bank: "ব্যাংক ট্রান্সফার",
  global: "গ্লোবাল",
};

type PanelType = "gateway" | "faq" | "support" | "info";
type TabType = "mfs" | "bank" | "global";

export default function Checkout() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const gatewayIdParam = searchParams.get("gateway");

  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [support, setSupport] = useState<Record<string,string>>({});
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [theme, setTheme] = useState<ThemeCfg>({...DEFAULTS});

  const [selectedGw, setSelectedGw] = useState<Gateway | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("mfs");
  const [panel, setPanel] = useState<PanelType>("gateway");
  const [showOrder, setShowOrder] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string|null>(null);

  // Sub-option modal
  const [subOptions, setSubOptions] = useState<Gateway[]>([]);
  const [showSubModal, setShowSubModal] = useState(false);

  // Payment form
  const [sender, setSender] = useState("");
  const [trxId, setTrxId] = useState("");
  const [slip, setSlip] = useState<File|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);
  const [qrModal, setQrModal] = useState(false);
  const [lang, setLang] = useState<"en"|"bn">("en");
  const [termsContent, setTermsContent] = useState<string>("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Force light mode on checkout
  useEffect(() => {
    const prev = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => { if(prev) document.documentElement.classList.add("dark"); };
  }, []);

  useEffect(() => { if(ref) loadData(); }, [ref]);

  // Realtime: listen for transaction status changes
  useEffect(() => {
    if (!ref || !txn) return;
    const channel = supabase
      .channel(`checkout-txn-${ref}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `reference=eq.${ref}` },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus && newStatus !== "pending") {
            setTxn((prev) => prev ? { ...prev, status: newStatus } : prev);
            navigate(`/payment/${ref}`, { replace: true });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ref, txn?.id]);

  // Realtime: listen for brand changes (logo, name, colors)
  useEffect(() => {
    if (!brand?.id) return;
    const channel = supabase
      .channel(`checkout-brand-${brand.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "brands", filter: `id=eq.${brand.id}` },
        (payload) => {
          const updated = payload.new as any;
          setBrand(prev => prev ? { ...prev, name: updated.name, logo_url: updated.logo_url, primary_color: updated.primary_color } : prev);
          if (updated.primary_color) {
            setTheme(prev => ({ ...prev, accent_color: updated.primary_color }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [brand?.id]);

  // Realtime: listen for support settings changes
  useEffect(() => {
    if (!txn?.organization_id) return;
    const channel = supabase
      .channel(`checkout-settings-${txn.organization_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: `organization_id=eq.${txn.organization_id}` },
        (payload) => {
          const row = payload.new as any;
          if (row?.name?.startsWith("support_")) {
            setSupport(prev => ({ ...prev, [row.name]: row.value || "" }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [txn?.organization_id]);

  // Auto-select gateway from URL param
  useEffect(() => {
    if(gatewayIdParam && gateways.length > 0 && !selectedGw) {
      const gw = gateways.find(g => g.id === gatewayIdParam);
      if(gw) setSelectedGw(gw);
    }
  }, [gatewayIdParam, gateways]);

  const loadData = async () => {
    try {
      const { data: t } = await supabase.from("transactions").select("*").eq("reference", ref).maybeSingle();
      if(!t) { toast.error("Transaction not found"); setLoading(false); return; }
      if(t.status === "completed" || t.status === "refunded" || t.status === "failed") {
        navigate(`/payment/${ref}`, { replace: true }); return;
      }
      setTxn(t);

      const { brand: resolvedBrand, brandId: resolvedBrandId } = await resolveCheckoutBrand({
        organizationId: t.organization_id,
        paymentLinkId: t.payment_link_id,
        gatewayId: t.gateway_id,
        preferredBrandId: (t.metadata as any)?.brand_id || null,
      });

      const [gwR, faqR, setR, brandSetR, currR] = await Promise.all([
        (async () => {
          let query = supabase
            .from("gateways")
            .select("*")
            .eq("organization_id", t.organization_id)
            .eq("is_active", true)
            .order("created_at");
          if (resolvedBrandId) {
            query = query.eq("brand_id", resolvedBrandId);
          }
          return query;
        })(),
        (async () => {
          let query = supabase.from("faqs").select("*").eq("organization_id", t.organization_id).eq("is_active", true).order("order_column");
          if (resolvedBrandId) {
            query = query.eq("brand_id", resolvedBrandId);
          }
          return query;
        })(),
        supabase.from("settings").select("name, value").eq("organization_id", t.organization_id)
          .in("name", ["maintenance_mode","maintenance_message"]),
        resolvedBrandId
          ? supabase.from("brand_settings").select("name, value").eq("organization_id", t.organization_id).eq("brand_id", resolvedBrandId)
              .in("name", ["support_whatsapp","support_telegram","support_messenger","support_website","support_email","support_phone"])
          : supabase.from("settings").select("name, value").eq("organization_id", t.organization_id)
              .in("name", ["support_whatsapp","support_telegram","support_messenger","support_website","support_email","support_phone"]),
        supabase.from("currencies").select("code, exchange_rate, symbol").eq("organization_id", t.organization_id).eq("is_active", true),
      ]);

      if(setR.data) {
        const mm = setR.data.find(s => s.name === "maintenance_mode");
        if(mm?.value === "true") {
          const msg = setR.data.find(s => s.name === "maintenance_message");
          setMaintenance(true);
          setMaintenanceMsg(msg?.value || "We're currently performing scheduled maintenance. We'll be back shortly.");
          setLoading(false);
          return;
        }
      }

      if(gwR.data) setGateways(gwR.data as any);
      if(currR.data) setCurrencies(currR.data as CurrencyRate[]);
      if(faqR.data) setFaqs(faqR.data as any);
      if(resolvedBrand) setBrand(resolvedBrand);
      if(brandSetR.data) {
        const m: Record<string,string> = {};
        brandSetR.data.forEach((s: any) => { if(s.value) m[s.name] = s.value; });
        setSupport(m);
      }

      if(resolvedBrandId) {
        const { data: td } = await supabase.from("theme_settings").select("name, value").eq("organization_id", t.organization_id).eq("brand_id", resolvedBrandId);
        if(td && td.length > 0) {
          const loaded = {...DEFAULTS};
          if(resolvedBrand?.primary_color) loaded.accent_color = resolvedBrand.primary_color;
          td.forEach(s => { if(s.name in loaded && s.value) (loaded as any)[s.name] = s.value; });
          // Force light mode colors on checkout
          Object.assign(loaded, LIGHT_COLORS);
          setTheme(loaded);
          // Load terms_conditions
          const tc = td.find(s => s.name === "terms_conditions");
          if(tc?.value) setTermsContent(tc.value);
        } else if(resolvedBrand?.primary_color) {
          setTheme(prev => ({...prev, accent_color: resolvedBrand.primary_color!}));
        }
      }

      if(gwR.data && gwR.data.length > 0) {
        const groups = gwR.data.map(g => g.gateway_group);
        if(groups.includes("mfs")) setActiveTab("mfs");
        else if(groups.includes("bank")) setActiveTab("bank");
        else setActiveTab("global");
      }
    } catch(err) { console.error(err); toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  const filtered = gateways.filter(g => g.gateway_group === activeTab);
  const tabs = [...new Set(gateways.map(g => g.gateway_group))] as TabType[];
  const pc = theme.accent_color;
  // Gateway-specific brand color: use gateway's own color when selected, fallback to theme accent
  const gwColor = selectedGw ? getGatewayBrand(selectedGw.gateway_type, selectedGw.display_name).color : pc;
  const pcLt = hexToLt(pc);

  const fees = useMemo(() => {
    if(!txn || !selectedGw) return { fee:0, discount:0, total: txn?.amount||0, convertedAmount: txn?.amount||0, needsConversion: false, gwCurrency: txn?.currency||"USD" };
    let baseAmount = txn.amount;
    const gwCurrency = selectedGw.currency || txn.currency;
    let needsConversion = false;
    let convertedAmount = baseAmount;

    // Currency conversion: if txn currency differs from gateway currency
    if (txn.currency !== gwCurrency && currencies.length > 0) {
      const fromRate = currencies.find(c => c.code === txn.currency)?.exchange_rate;
      const toRate = currencies.find(c => c.code === gwCurrency)?.exchange_rate;
      if (fromRate && toRate && fromRate > 0) {
        convertedAmount = Math.round((baseAmount / fromRate * toRate) * 100) / 100;
        needsConversion = true;
        baseAmount = convertedAmount;
      }
    }

    const f = selectedGw.fixed_charge + (baseAmount * selectedGw.percent_charge)/100;
    const d = selectedGw.fixed_discount + (baseAmount * selectedGw.percent_discount)/100;
    return { fee: Math.round(f*100)/100, discount: Math.round(d*100)/100, total: Math.round((baseAmount+f-d)*100)/100, convertedAmount, needsConversion, gwCurrency };
  }, [txn, selectedGw, currencies]);

  const copyText = (text:string, label:string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied!");
  };

  const handleSubmit = async () => {
    if(!selectedGw || !txn) return;
    if(!trxId?.trim()) { toast.error("Transaction ID is required"); return; }
    setSubmitting(true);
    try {
      if(trxId?.trim()) {
        const { data: usedSms } = await supabase.from("sms_data").select("id")
          .eq("organization_id", txn.organization_id).eq("transaction_id", trxId.trim()).eq("status","used").limit(1);
        if(usedSms && usedSms.length > 0) { toast.error("This Transaction ID has already been used for another payment"); setSubmitting(false); return; }
      }

      const meta = {
        ...(txn.metadata||{}), sender_number: sender, trx_id: trxId||null, submitted_at: new Date().toISOString(),
        ...(fees.needsConversion ? {
          original_amount: txn.amount,
          original_currency: txn.currency,
          converted_amount: fees.convertedAmount,
          converted_currency: fees.gwCurrency,
        } : {}),
      };

      // Upload payment slip if provided
      if (slip) {
        try {
          const fileExt = slip.name.split('.').pop() || 'jpg';
          const fileName = `slips/${txn.organization_id}/${txn.id}.${fileExt}`;
          await supabase.storage.from("gateway-assets").upload(fileName, slip, { upsert: true });
          const { data: urlData } = supabase.storage.from("gateway-assets").getPublicUrl(fileName);
          if (urlData?.publicUrl) meta.slip_url = urlData.publicUrl;
        } catch (e) { console.error("Slip upload failed:", e); }
      }

      await supabase.from("transactions").update({
        gateway_id: selectedGw.id, status: "pending", metadata: meta,
      }).eq("id", txn.id);

      // Reverse-match: check if SMS with this TrxID already arrived
      if (trxId?.trim()) {
        try {
          const { data: matchResult } = await supabase.functions.invoke("checkout-verify", {
            body: { transaction_id: txn.id, trx_id: trxId.trim() },
          });
          if (matchResult?.reason === "trx_id_already_used") {
            toast.error("This Transaction ID has already been used for another payment");
            setSubmitting(false);
            return;
          }
          if (matchResult?.matched) {
            toast.success("Payment verified automatically!");
            navigate(`/payment/${ref}`);
            return;
          }
        } catch (e) {
          console.error("Reverse-match check failed:", e);
        }
      }

      toast.success("Payment submitted!");
      navigate(`/payment/${ref}`);
    } catch(err) { console.error(err); toast.error("Failed"); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if(!txn) return;
    await supabase.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    const ret = txn.metadata?.return_url;
    if(ret) window.location.href = `${ret}?status=canceled&ref=${ref}`;
    else navigate(`/payment/${ref}`);
  };

  // Group gateways by type for sub-option detection
  const gwByType = useMemo(() => {
    const map: Record<string, Gateway[]> = {};
    filtered.forEach(gw => {
      const key = gw.gateway_type;
      if(!map[key]) map[key] = [];
      map[key].push(gw);
    });
    return map;
  }, [filtered]);

  // Get unique display gateways (one per type, first one)
  const displayGateways = useMemo(() => {
    const seen = new Set<string>();
    return filtered.filter(gw => {
      if(seen.has(gw.gateway_type)) return false;
      seen.add(gw.gateway_type);
      return true;
    });
  }, [filtered]);

  const handleGatewayClick = (gw: Gateway) => {
    const sameType = gwByType[gw.gateway_type] || [];
    if(sameType.length > 1) {
      setSubOptions(sameType);
      setShowSubModal(true);
    } else {
      selectGw(gw);
    }
  };

  const selectGw = (gw: Gateway) => {
    setSelectedGw(gw);
    setShowSubModal(false);
    setSearchParams({ gateway: gw.id });
  };
  const deselectGw = () => {
    setSelectedGw(null);
    searchParams.delete("gateway");
    setSearchParams(searchParams);
  };

  // ─── Loading ──────────────────────
  if(loading) return (
    <div className="hz-page flex items-center justify-center" style={{background: theme.bg_color}}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{borderColor: pc}} />
    </div>
  );

  // ─── Maintenance Mode ─────────────
  if(maintenance) return (
    <div className="hz-page flex items-center justify-center" style={{background:"#f5f6f9"}}>
      <div className="hz-card p-8 text-center max-w-md mx-4">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{background:`${pc}18`}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <h2 className="text-xl font-semibold mt-2" style={{color:"#111827"}}>Under Maintenance</h2>
        <p className="text-sm mt-2" style={{color:"#6b7280"}}>{maintenanceMsg}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{background:"#fef3c7", color:"#92400e"}}>
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Maintenance in progress
        </div>
      </div>
    </div>
  );

  // ─── Not Found ────────────────────
  if(!txn) return (
    <div className="hz-page flex items-center justify-center" style={{background:"#f5f6f9"}}>
      <div className="hz-card p-8 text-center max-w-md mx-4">
        <div className="hz-status-icon mx-auto" style={{background:"#fee2e2"}}><X className="h-8 w-8" style={{color:"#dc2626"}} /></div>
        <h2 className="text-xl font-semibold mt-2" style={{color:"#111827"}}>Transaction Not Found</h2>
        <p className="text-sm mt-1" style={{color:"#9ca3af"}}>The payment reference is invalid or has expired.</p>
      </div>
    </div>
  );

  const gwParams = selectedGw?.gateway_parameters as any || {};
  const mobileNum = gwParams.mobile_number || gwParams.account_number || "";
  const gwType = selectedGw?.gateway_type || "";
  
  // Get lang_text from template, fall back to legacy GW_INSTRUCTIONS
  const langText = selectedGw ? getGatewayLangText(selectedGw.display_name) : undefined;
  const gwInst = GW_INSTRUCTIONS[gwType]?.(mobileNum, fees.total.toString(), txn.currency);
  // instructions split into before (shown before account/amount) and after (shown after)
  const instructionsBefore: string[] = langText
    ? langText[lang].slice(0, 2)
    : gwInst?.before || [`Send ${fees.total} ${fees.gwCurrency} to: ${mobileNum}`];
  const instructionsAfter: string[] = langText
    ? langText[lang].slice(2)
    : gwInst?.after || [`Complete the transfer`, `Enter the TrxID below`];

  return (
    <div className="hz-page hz-page-pattern" style={{background: theme.bg_color, fontFamily: `'${theme.font_family}', sans-serif`}}>
      <div className="hz-wrap pb-24">

        {/* ─── Top Bar ───────────────────── */}
        <div className="hz-card mb-6">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => { if(selectedGw) deselectGw(); else if(panel !== "gateway") setPanel("gateway"); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{color: theme.muted_color}}>
              <Home className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{color: theme.muted_color}} title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}>
                {lang === "bn" ? "EN" : "বাং"}
              </button>
              <button onClick={handleCancel} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{color: theme.muted_color}}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Brand Logo Centered (hidden when gateway selected) ────────── */}
        {!selectedGw && (
          <div className="flex flex-col items-center mb-6">
            <div className="hz-brand-circle" style={{borderColor: `${pc}30`}}>
              {brand?.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{background: pc, color:"#fff"}}>
                  {brand?.name?.charAt(0)||"B"}
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold mt-3" style={{color: theme.text_color}}>{brand?.name || "Payment"}</h2>
          </div>
        )}

        {/* ─── Icon Buttons (Support, FAQ, Info) ── */}
        {!selectedGw && <div className="flex items-center justify-center gap-4 mb-6">
          {(theme.show_nav_buttons === "all" || theme.show_nav_buttons === "support") && (
            <button onClick={() => setPanel(panel === "support" ? "gateway" : "support")}
              className="hz-icon-btn" style={{background: panel === "support" ? `${pc}18` : theme.card_bg_color, borderColor: theme.border_color}}>
              <Headphones className="h-5 w-5" style={{color: panel === "support" ? pc : theme.muted_color}} />
            </button>
          )}
          {(theme.show_nav_buttons === "all" || theme.show_nav_buttons === "faq") && faqs.length > 0 && (
            <button onClick={() => setPanel(panel === "faq" ? "gateway" : "faq")}
              className="hz-icon-btn" style={{background: panel === "faq" ? `${pc}18` : theme.card_bg_color, borderColor: theme.border_color}}>
              <HelpCircle className="h-5 w-5" style={{color: panel === "faq" ? pc : theme.muted_color}} />
            </button>
          )}
          <button onClick={() => setPanel(panel === "info" ? "gateway" : "info")}
            className="hz-icon-btn" style={{background: panel === "info" ? `${pc}18` : theme.card_bg_color, borderColor: theme.border_color}}>
            <Info className="h-5 w-5" style={{color: panel === "info" ? pc : theme.muted_color}} />
          </button>
        </div>}

        {/* ─── Panel: Gateway ────────────── */}
        {panel === "gateway" && !selectedGw && (
          <>
            {/* Tab Row — Full Width Segmented */}
            {tabs.length > 1 && (
              <div className="flex mb-5 rounded-xl overflow-hidden" style={{border: `1px solid ${theme.border_color}`}}>
                {tabs.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="flex-1 py-3 text-sm font-semibold transition-all"
                    style={activeTab === tab
                      ? {background: pc, color:"#fff"}
                      : {background: theme.card_bg_color, color: theme.muted_color}}>
                    {(lang === "bn" ? TAB_LABELS_BN : TAB_LABELS_EN)[tab] || tab.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Gateway Grid — layout based on theme preset */}
            {/* Classic: 2-col grid, logo only */}
            {(theme.gateway_columns === "classic" || (!["compact","card"].includes(theme.gateway_columns))) && (
              <div className="grid grid-cols-2 gap-3">
                {displayGateways.map(gw => (
                  <button key={gw.id} onClick={() => handleGatewayClick(gw)}
                    className="hz-gw-card-v2 group"
                    style={{borderColor: theme.border_color, background: theme.card_bg_color, borderRadius: `${Math.min(parseInt(theme.border_radius),12)}px`}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = pc; e.currentTarget.style.boxShadow = `0 4px 16px ${pc}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border_color; e.currentTarget.style.boxShadow = "none"; }}>
                    <div className="flex items-center justify-center h-[50px]">
                      {(() => {
                        const logoUrl = gw.image_url || (gw.gateway_type);
                        return logoUrl ? (
                          <img src={logoUrl} alt={gw.display_name} className="max-h-[38px] max-w-full object-contain" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{background: pc, color:"#fff"}}>{gw.display_name.charAt(0)}</div>
                        );
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Compact: single-column list rows */}
            {theme.gateway_columns === "compact" && (
              <div className="space-y-2">
                {displayGateways.map(gw => {
                  const logoUrl = gw.image_url || (gw.gateway_type);
                  return (
                    <button key={gw.id} onClick={() => handleGatewayClick(gw)}
                      className="w-full flex items-center gap-3 p-3 transition-all border"
                      style={{borderColor: theme.border_color, background: theme.card_bg_color, borderRadius: `${Math.min(parseInt(theme.border_radius),12)}px`}}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = pc; e.currentTarget.style.background = `${pc}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border_color; e.currentTarget.style.background = theme.card_bg_color; }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{border: `1px solid ${theme.border_color}`}}>
                        {logoUrl ? (
                          <img src={logoUrl} alt={gw.display_name} className="max-h-[28px] max-w-[36px] object-contain" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{background: pc, color:"#fff"}}>{gw.display_name.charAt(0)}</div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-left" style={{color: theme.text_color}}>{gw.display_name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Card Grid: 3-col with logo + name + gradient bg on hover */}
            {theme.gateway_columns === "card" && (
              <div className="grid grid-cols-3 gap-2.5">
                {displayGateways.map(gw => {
                  const logoUrl = gw.image_url || (gw.gateway_type);
                  const gwBrand = getGatewayBrand(gw.gateway_type);
                  const gwCol = gwBrand?.color || pc;
                  return (
                    <button key={gw.id} onClick={() => handleGatewayClick(gw)}
                      className="flex flex-col items-center p-3 transition-all border"
                      style={{borderColor: theme.border_color, background: theme.card_bg_color, borderRadius: `${Math.min(parseInt(theme.border_radius),12)}px`}}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = gwCol; e.currentTarget.style.background = `${gwCol}0A`; e.currentTarget.style.boxShadow = `0 4px 12px ${gwCol}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border_color; e.currentTarget.style.background = theme.card_bg_color; e.currentTarget.style.boxShadow = "none"; }}>
                      <div className="flex items-center justify-center h-[40px] mb-1.5">
                        {logoUrl ? (
                          <img src={logoUrl} alt={gw.display_name} className="max-h-[32px] max-w-full object-contain" loading="lazy" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold" style={{background: pc, color:"#fff"}}>{gw.display_name.charAt(0)}</div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium truncate w-full text-center" style={{color: theme.text_color}}>{gw.display_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {filtered.length === 0 && <p className="text-center text-sm py-8" style={{color: theme.muted_color}}>No payment methods available</p>}
          </>
        )}

        {/* ─── Panel: Selected Gateway ────── */}
        {panel === "gateway" && selectedGw && (
          <div className="space-y-3">
            {/* Gateway Logo Centered */}
            <div className="flex flex-col items-center py-4">
              {(() => {
                const logoUrl = selectedGw.image_url || (selectedGw.gateway_type);
                return logoUrl ? (
                  <img src={logoUrl} alt={selectedGw.display_name} style={{maxHeight:"64px", maxWidth:"200px"}} className="object-contain" loading="lazy" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{background: gwColor, color:"#fff"}}>{selectedGw.display_name.charAt(0)}</div>
                );
              })()}
            </div>

            {/* Payment Details Card — Invoice left, Amount right */}
            <div className="hz-card overflow-hidden" style={{borderRadius: `${theme.border_radius}px`, borderColor: theme.border_color, background: theme.card_bg_color}}>
              {/* Top accent strip */}
              <div className="h-1" style={{background: `linear-gradient(90deg, ${pc}, ${gwColor})`}} />
              <div className="p-4 flex items-center justify-between gap-3">
                {/* Left: Brand + Invoice */}
                <div className="flex items-center gap-3 min-w-0">
                  {brand?.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{border: `2px solid ${theme.border_color}`}} />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{background: `${pc}15`, color: pc, border: `2px solid ${theme.border_color}`}}>
                      {(brand?.name || "M").charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{color: theme.text_color}}>{brand?.name || "Merchant"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileText className="h-3 w-3 flex-shrink-0" style={{color: theme.muted_color}} />
                      <p className="text-[11px] font-mono truncate" style={{color: theme.muted_color}}>{txn.reference || txn.id?.slice(0, 16)}</p>
                    </div>
                  </div>
                </div>
                {/* Right: Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold" style={{color: theme.text_color}}>{fees.total} {fees.gwCurrency}</p>
                  {fees.needsConversion && (
                    <p className="text-[10px] font-medium mt-0.5" style={{color: pc}}>≈ {txn.amount} {txn.currency}</p>
                  )}
                  {(selectedGw.percent_charge > 0 || selectedGw.fixed_charge > 0) && (
                    <p className="text-[10px] font-medium mt-0.5" style={{color: "#dc2626"}}>
                      {selectedGw.percent_charge > 0 ? `+${selectedGw.percent_charge}% fee` : `+${selectedGw.fixed_charge} ${fees.gwCurrency} fee`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ═══════ BANK TRANSFER LAYOUT ═══════ */}
            {selectedGw.gateway_group === "bank" ? (
              <>
                {/* ══ Bank Transfer — Premium Redesign ══ */}
                {(() => {
                  const bankColor = selectedGw.config?.primary_color || selectedGw.config?.btn_color || gwColor;
                  const bankName = gwParams.bank_name || gwParams.bankName || "";
                  const accountName = gwParams.account_name || gwParams.accountName || "";
                  const accountNumber = gwParams.account_number || gwParams.accountNumber || mobileNum || "";
                  const branchName = gwParams.branch_name || gwParams.branchName || "";
                  const routingNumber = gwParams.routing_number || gwParams.routingNumber || "";
                  const swiftCode = gwParams.swift_code || gwParams.swiftCode || "";

                  const details = [
                    { label: "Bank Name", value: bankName, icon: "🏦", copyable: false },
                    { label: "Account Name", value: accountName, icon: "👤", copyable: true, key: "acc_name" },
                    { label: "Account Number", value: accountNumber, icon: "🔢", copyable: true, key: "acc_num" },
                    { label: "Branch Name", value: branchName, icon: "📍", copyable: true, key: "branch" },
                    { label: "Routing Number", value: routingNumber, icon: "🔗", copyable: true, key: "routing" },
                    { label: "SWIFT Code", value: swiftCode, icon: "🌐", copyable: true, key: "swift" },
                  ].filter(d => d.value);

                  return (
                    <>
                      {/* Upload Payment Slip — glass card */}
                      <div className="rounded-2xl overflow-hidden" style={{
                        background: theme.card_bg_color,
                        border: `1.5px solid ${bankColor}25`,
                        boxShadow: `0 4px 20px ${bankColor}08`,
                      }}>
                        <div className="px-5 py-3.5 flex items-center gap-3" style={{
                          background: `linear-gradient(135deg, ${bankColor}12, ${bankColor}06)`,
                          borderBottom: `1px solid ${bankColor}15`,
                        }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background: `${bankColor}15`}}>
                            <Upload className="h-4 w-4" style={{color: bankColor}} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold" style={{color: theme.text_color}}>Upload Payment Slip</h3>
                            <p className="text-[11px]" style={{color: theme.muted_color}}>JPG, PNG or PDF — max 5MB</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <label className="group flex flex-col items-center gap-2.5 w-full px-4 py-5 cursor-pointer rounded-xl transition-all hover:scale-[1.01]"
                            style={{
                              border: `2px dashed ${slip ? bankColor : theme.border_color}`,
                              background: slip ? `${bankColor}06` : theme.bg_color,
                            }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all" style={{
                              background: slip ? `${bankColor}15` : `${theme.border_color}40`,
                            }}>
                              {slip ? <Check className="h-5 w-5" style={{color: bankColor}} /> : <Upload className="h-5 w-5" style={{color: theme.muted_color}} />}
                            </div>
                            {slip ? (
                              <div className="text-center">
                                <p className="text-sm font-semibold truncate max-w-[200px]" style={{color: theme.text_color}}>{slip.name}</p>
                                <p className="text-[11px] mt-0.5" style={{color: bankColor}}>Tap to change file</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-sm font-medium" style={{color: theme.text_color}}>Tap to upload</p>
                                <p className="text-[11px] mt-0.5" style={{color: theme.muted_color}}>or drag and drop</p>
                              </div>
                            )}
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setSlip(e.target.files?.[0]||null)} />
                          </label>
                        </div>
                      </div>

                      {/* Bank Details Card — rich gradient with frosted glass rows */}
                      <div className="rounded-2xl overflow-hidden" style={{
                        background: `linear-gradient(145deg, ${bankColor}, ${bankColor}bb)`,
                        boxShadow: `0 8px 32px ${bankColor}30`,
                      }}>
                        <div className="flex items-center justify-center gap-2 pt-5 pb-3">
                          <div className="h-px w-8" style={{background: "rgba(255,255,255,0.3)"}} />
                          <h3 className="text-sm font-bold text-white tracking-wide uppercase">Bank Account Details</h3>
                          <div className="h-px w-8" style={{background: "rgba(255,255,255,0.3)"}} />
                        </div>
                        <div className="px-4 pb-2">
                          {details.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1.5"
                              style={{background: "rgba(255,255,255,0.08)"}}>
                              <span className="text-base flex-shrink-0">{d.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">{d.label}</p>
                                <p className="text-[13px] font-bold mt-0.5" style={{color: "#fde68a", wordBreak: "break-all"}}>{d.value}</p>
                              </div>
                              {d.copyable && (
                                <button onClick={() => copyText(d.value, d.key!)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-all active:scale-90"
                                  style={{
                                    background: copied === d.key ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
                                    color: "#fff",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                  }}>
                                  {copied === d.key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  {copied === d.key ? "Copied!" : "Copy"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mx-4 mb-4 px-4 py-3 rounded-xl flex items-start gap-2.5" style={{background: "rgba(0,0,0,0.15)"}}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{background: "#fbbf24"}}>
                            <Info className="h-3 w-3" style={{color: bankColor}} />
                          </div>
                          <p className="text-[11px] leading-relaxed text-white/90">
                            Complete your bank transfer using the details above. Then upload your bank slip and click <span className="font-bold" style={{color: "#fde68a"}}>SUBMIT</span>.
                          </p>
                        </div>
                      </div>

                      {/* Sender Name — structured card */}
                      <div className="rounded-2xl overflow-hidden" style={{
                        background: theme.card_bg_color,
                        border: `1.5px solid ${theme.border_color}`,
                      }}>
                        <div className="px-4 py-3" style={{borderBottom: `1px solid ${theme.border_color}`}}>
                          <label className="text-sm font-semibold flex items-center gap-2" style={{color: theme.text_color}}>
                            Sender Name / Reference <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{background: "#fef2f2", color: "#dc2626"}}>Required</span>
                          </label>
                        </div>
                        <div className="p-4">
                          <input type="text" value={sender} onChange={e => setSender(e.target.value)} placeholder="Your name or bank reference"
                            className="w-full px-4 py-3 text-sm focus:outline-none rounded-xl transition-all"
                            style={{border: `1.5px solid ${theme.border_color}`, color: theme.text_color, background: theme.bg_color}}
                            onFocus={e => { e.target.style.borderColor = bankColor; e.target.style.boxShadow = `0 0 0 3px ${bankColor}15`; }}
                            onBlur={e => { e.target.style.borderColor = theme.border_color; e.target.style.boxShadow = "none"; }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              /* ═══════ MFS / OTHER LAYOUT (existing) ═══════ */
              <>
                {/* Sender Number Card — hide for MFS gateways */}
                {selectedGw.gateway_group !== "mfs" && (
                  <div className="hz-card p-4" style={{borderRadius: `${theme.border_radius}px`, borderColor: theme.border_color, background: theme.card_bg_color}}>
                    <label className="block text-sm font-medium mb-1.5" style={{color: theme.text_color}}>Sender Number <span style={{color:"#dc2626"}}>*</span></label>
                    <input type="text" value={sender} onChange={e => setSender(e.target.value)} placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{borderRadius: `${theme.button_radius}px`, border: `1px solid ${theme.border_color}`, color: theme.text_color, background: theme.card_bg_color}} />
                  </div>
                )}

                {/* Gradient Instruction Card — use gateway's own color */}
                {(() => {
                  const instrColor = selectedGw.config?.primary_color || selectedGw.config?.btn_color || gwColor;
                  return (
                <div className="rounded-2xl p-5 space-y-0" style={{background: `linear-gradient(135deg, ${instrColor}, ${instrColor}dd)`}}>
                  <h3 className="text-center text-lg font-bold text-white mb-3">Enter Transaction ID</h3>
                  <input type="text" value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="Enter Transaction ID"
                    className="w-full px-4 py-3 text-sm focus:outline-none rounded-xl mb-4"
                    style={{background: "#fff", color: theme.text_color, border: "none"}} />
                  <div className="space-y-0">
                    {instructionsBefore.map((inst, i) => (
                      <div key={`b-${i}`} className="flex items-start gap-3 py-3" style={{borderBottom: "1px solid rgba(255,255,255,0.2)"}}>
                        <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-1.5" />
                        <p className="text-sm flex-1 text-white/90">{inst}</p>
                      </div>
                    ))}
                    {mobileNum && (
                      <div className="flex items-center gap-2 py-3 flex-wrap" style={{borderBottom: "1px solid rgba(255,255,255,0.2)"}}>
                        <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                        <span className="text-sm text-white/90">Enter the Receiver Account Number:</span>
                        <div className="flex items-center gap-2 mt-1 w-full pl-5">
                          <span className="text-base font-bold" style={{color: "#fbbf24"}}>{mobileNum}</span>
                          <button onClick={() => copyText(mobileNum, "number")}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium" style={{background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)"}}>
                            {copied==="number" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                          </button>
                          {selectedGw.has_qr_code && selectedGw.qr_code && (
                            <button onClick={() => setQrModal(true)}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium" style={{background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)"}}>
                              <Eye className="h-3 w-3" /> Show QR
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 py-3" style={{borderBottom: "1px solid rgba(255,255,255,0.2)"}}>
                      <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-1.5" />
                      <p className="text-sm text-white/90">Enter the amount: <span className="font-bold" style={{color: "#fbbf24"}}>{fees.total}</span></p>
                    </div>
                    {instructionsAfter.map((inst, i) => (
                      <div key={`a-${i}`} className="flex items-start gap-3 py-3" style={{borderBottom: "1px solid rgba(255,255,255,0.2)"}}>
                        <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-1.5" />
                        <p className="text-sm flex-1 text-white/90">{inst}</p>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 py-3">
                      <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-1.5" />
                      <p className="text-sm text-white/90">Put the <span className="font-bold" style={{color: "#fbbf24"}}>Transaction ID</span> in the upper box and press <span className="font-bold" style={{color: "#fbbf24"}}>VERIFY</span></p>
                    </div>
                  </div>
                </div>
                  );
                })()}

                {/* QR Modal — Centered, no-scroll, animated */}
                {qrModal && selectedGw.qr_code && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{animation: "hz-overlay-in 0.3s ease-out forwards"}} onClick={() => setQrModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                    <div
                      className="relative w-full max-w-[340px] rounded-3xl overflow-hidden"
                      style={{
                        background: "#fff",
                        boxShadow: `0 32px 64px -16px rgba(0,0,0,0.4), 0 0 0 1px ${gwColor}15`,
                        animation: "hz-qr-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="relative py-5 flex flex-col items-center gap-1.5" style={{ background: `linear-gradient(135deg, ${gwColor}, ${gwColor}dd)` }}>
                        <button onClick={() => setQrModal(false)}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 text-white/90 hover:bg-white/30 transition-all hover:scale-110 active:scale-95">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {(() => {
                          const logoUrl = selectedGw.image_url || (selectedGw.gateway_type);
                          return logoUrl ? (
                            <div className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center p-1.5 shadow-lg" style={{animation: "hz-check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both"}}>
                              <img src={logoUrl} alt={selectedGw.display_name} className="h-8 w-8 object-contain" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center shadow-lg text-base font-bold" style={{color: gwColor}}>
                              {selectedGw.display_name.charAt(0)}
                            </div>
                          );
                        })()}
                        <p className="text-white text-xs font-medium tracking-wide opacity-90">Scan to Pay</p>
                      </div>
                      <div className="flex flex-col items-center px-6 pt-5 pb-3">
                        <div className="relative p-3 rounded-2xl" style={{ background: `${pc}06`, border: `2px dashed ${pc}30` }}>
                          <img src={selectedGw.qr_code} alt="QR Code" className="w-[180px] h-[180px] rounded-xl object-contain" />
                          <div className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] rounded-tl-lg" style={{borderColor: pc}} />
                          <div className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] rounded-tr-lg" style={{borderColor: pc}} />
                          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] rounded-bl-lg" style={{borderColor: pc}} />
                          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] rounded-br-lg" style={{borderColor: pc}} />
                        </div>
                      </div>
                      <div className="px-5 pb-4 flex flex-col items-center gap-2">
                        {mobileNum && (
                          <button onClick={() => copyText(mobileNum, "number")}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-mono font-semibold transition-all active:scale-95"
                            style={{ background: `${gwColor}0d`, color: gwColor, border: `1px solid ${gwColor}20` }}>
                            {mobileNum}
                            {copied === "number" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-50" />}
                          </button>
                        )}
                        <div className="px-5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${gwColor}10`, color: gwColor }}>
                          {fees.total} {fees.gwCurrency}
                        </div>
                      </div>
                      <div className="px-6 pb-4 text-center">
                        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                          {selectedGw.display_name} অ্যাপ দিয়ে QR কোডটি স্ক্যান করে <span className="font-semibold" style={{color: gwColor}}>সেন্ড মানি</span> করুন
                        </p>
                      </div>
                      <button onClick={() => setQrModal(false)}
                        className="w-full py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
                        style={{ background: gwColor, color: "#fff" }}>
                        বন্ধ করুন
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Slip — hide for MFS gateways */}
                {selectedGw.gateway_group !== "mfs" && (
                  <div className="hz-card p-4" style={{borderRadius: `${theme.border_radius}px`, borderColor: theme.border_color, background: theme.card_bg_color}}>
                    <label className="block text-sm font-medium mb-1.5" style={{color: theme.text_color}}>Upload Slip (Optional)</label>
                    <label className="flex items-center justify-center gap-2 w-full px-3 py-3 cursor-pointer text-sm"
                      style={{borderRadius: `${theme.button_radius}px`, border: `2px dashed ${theme.border_color}`, color: theme.muted_color}}>
                      <Upload className="h-4 w-4" />{slip ? slip.name : "Choose file"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => setSlip(e.target.files?.[0]||null)} />
                    </label>
                  </div>
                )}
              </>
            )}

            {/* VERIFY / SUBMIT Button — use gateway's own color */}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3.5 text-base font-bold tracking-wide transition-all hover:opacity-90 disabled:opacity-50 rounded-xl"
              style={{background: gwColor, color: selectedGw.config?.btn_text_color || "#fff"}}>
              {submitting ? "Processing..." : selectedGw.gateway_group === "bank" ? "SUBMIT" : "VERIFY"}
            </button>

          </div>
        )}

        {/* ─── Panel: FAQ ──────────────── */}
        {panel === "faq" && (
          <div className="hz-card p-4 space-y-2" style={{borderRadius: `${theme.border_radius}px`, background: theme.card_bg_color}}>
            <h3 className="font-semibold mb-3" style={{color: theme.text_color}}>Frequently Asked Questions</h3>
            {faqs.map((faq, idx) => (
              <div key={faq.id} className="rounded-lg overflow-hidden" style={{border: `1px solid ${theme.border_color}`}}>
                <button onClick={() => setExpandedFaq(expandedFaq===faq.id?null:faq.id)}
                  className="w-full flex items-center gap-3 p-3 text-left">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center" style={{background: pc, color:"#fff"}}>{idx+1}</span>
                  <span className="flex-1 text-sm font-medium" style={{color: theme.text_color}}>{faq.title}</span>
                  {expandedFaq===faq.id ? <ChevronUp className="h-4 w-4" style={{color: theme.muted_color}} /> : <ChevronDown className="h-4 w-4" style={{color: theme.muted_color}} />}
                </button>
                {expandedFaq===faq.id && (
                  <div className="px-3 pb-3 pl-12">
                    <p className="text-sm leading-relaxed" style={{color: theme.muted_color}}>{faq.content}</p>
                  </div>
                )}
              </div>
            ))}
            {faqs.length===0 && <p className="text-center text-sm py-4" style={{color: theme.muted_color}}>No FAQs available</p>}
          </div>
        )}

        {/* ─── Panel: Support ──────────── */}
        {panel === "support" && (
          <div className="hz-card p-4" style={{borderRadius: `${theme.border_radius}px`, background: theme.card_bg_color}}>
            <h3 className="font-semibold mb-3" style={{color: theme.text_color}}>Contact Support</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {icon:MessageCircle, label:"WhatsApp", color:"#25D366", key:"support_whatsapp"},
                {icon:Send, label:"Telegram", color:"#229ED9", key:"support_telegram"},
                {icon:Facebook, label:"Messenger", color:"#0078FF", key:"support_messenger"},
                {icon:Globe, label:"Website", color:"#7c3aed", key:"support_website"},
                {icon:Mail, label:"Email", color:"#dc2626", key:"support_email"},
                {icon:Phone, label:"Phone", color:"#16a34a", key:"support_phone"},
              ].filter(i => support[i.key]).map(item => {
                const val = support[item.key];
                const href = item.key==="support_whatsapp" ? `https://wa.me/${val.replace(/[^0-9]/g,"")}`
                  : item.key==="support_phone" ? `tel:${val}`
                  : item.key==="support_email" ? `mailto:${val}` : val;
                return (
                  <a key={item.label} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 rounded-lg hover:shadow-sm transition-all"
                    style={{border: `1px solid ${theme.border_color}`}}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: item.color, color:"#fff"}}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium" style={{color: theme.text_color}}>{item.label}</span>
                  </a>
                );
              })}
              {Object.keys(support).filter(k => k.startsWith("support_")).length===0 && <p className="col-span-2 text-center text-sm py-4" style={{color: theme.muted_color}}>No support contacts</p>}
            </div>
          </div>
        )}

        {/* ─── Panel: Info (Order Details) ── */}
        {panel === "info" && (
          <div className="hz-card p-4" style={{borderRadius: `${theme.border_radius}px`, background: theme.card_bg_color}}>
            <h3 className="font-semibold mb-3" style={{color: theme.text_color}}>Order Details</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span style={{color: theme.muted_color}}>Invoice</span>
                <span className="font-mono text-xs" style={{color: theme.text_color}}>{txn.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{color: theme.muted_color}}>Amount</span>
                <span className="font-medium" style={{color: theme.text_color}}>{txn.amount} {txn.currency}</span>
              </div>
              {selectedGw && fees.needsConversion && (
                <div className="flex justify-between text-sm">
                  <span style={{color: theme.muted_color}}>Converted ({fees.gwCurrency})</span>
                  <span className="font-medium" style={{color: pc}}>{fees.convertedAmount} {fees.gwCurrency}</span>
                </div>
              )}
              {selectedGw && fees.fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{color: theme.muted_color}}>Processing Fee</span>
                  <span style={{color: theme.text_color}}>+{fees.fee} {fees.gwCurrency}</span>
                </div>
              )}
              {selectedGw && fees.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{color: theme.muted_color}}>Discount</span>
                  <span style={{color:"#16a34a"}}>-{fees.discount} {fees.gwCurrency}</span>
                </div>
              )}
              <div className="pt-2.5" style={{borderTop: `2px solid ${theme.border_color}`}}>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold" style={{color: theme.text_color}}>Total</span>
                  <span className="text-[17px] font-bold" style={{color: pc}}>{selectedGw ? fees.total : txn.amount} {fees.gwCurrency}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Footer ────────────────────── */}
        {theme.show_powered_by==="true" && (
          <div className="hz-footer" style={{color: theme.muted_color}}>
            <ShieldCheck className="h-4 w-4" style={{color:"#16a34a"}} />
            <span>{theme.watermark_text || <>Secured by <strong>{brand?.name || "UR BDT Pay"}</strong></>}</span>
          </div>
        )}
        {theme.footer_links && (
          <p className="text-center text-[11px] mt-1" style={{color: theme.muted_color}}
            dangerouslySetInnerHTML={{__html: theme.footer_links}} />
        )}

        {/* ─── Terms & Conditions Modal ──── */}
        {showTermsModal && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
            <div
              className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl"
              style={{animation: "hz-modal-up .3s ease-out"}}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="px-6 pt-6 pb-4 text-center relative">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" style={{color: "#9ca3af"}} />
                </button>
                <h2 className="text-xl font-bold" style={{color: "#111827"}}>
                  Easy Checkout: Terms &amp; Conditions
                </h2>
                <p className="text-sm mt-1.5" style={{color: "#9ca3af"}}>
                  Please read carefully (Last Updated: {new Date().toLocaleDateString("en-US", {month: "long", year: "numeric"})})
                </p>
              </div>

              {/* ── Divider ── */}
              <div className="mx-6 h-px" style={{background: `linear-gradient(to right, transparent, ${pc}40, transparent)`}} />

              {/* ── Scrollable Body ── */}
              <div className="overflow-y-auto flex-1 px-6 py-5" style={{maxHeight: "60vh"}}>
                {termsContent ? (
                  <div
                    className="prose prose-sm max-w-none text-[15px] leading-[1.8]"
                    style={{color: "#374151"}}
                    dangerouslySetInnerHTML={{__html: termsContent}}
                  />
                ) : (
                  <div className="text-[15px] leading-[1.8] space-y-5" style={{color: "#374151"}}>
                    <p>
                      By clicking "Pay", you agree to these Terms of Service for using <strong>{brand?.name || "our"}</strong> payment
                      processing services (the "Services"). The term "you" or "You" shall refer to any person or entity who views, uses,
                      accesses the checkout service and submits payment instrument data to our secure environment for processing payments.
                      These Terms of Service set forth the legally binding terms and conditions for Your use of the Service.
                    </p>
                    <p>
                      <strong>1.</strong> You are authorizing us to process your payment data in our secured environment and You are aware and
                      agreed about all the consequences in relation to processing payment data in our system, including debit from your bank
                      account or mobile wallet for accepting payment for the service/product that you are availing from the Merchants concerned
                      as per modality and terms &amp; conditions stipulated by them.
                    </p>
                    <p>
                      <strong>2.</strong> You have used your best possible and secured process to submit your payment data in our System that
                      is including but not limited to using a personal device free from any computer virus or any other malicious programs,
                      updated internet browser, not using any public internet, or insecure Wi-Fi network, etc. In case of any data-breach which
                      occurs due to your negligence, we shall not be held liable.
                    </p>
                    <p>
                      <strong>3.</strong> All payments are subject to verification. We employ industry-standard encryption and security measures
                      to protect your financial information. Your personal and financial information is handled in accordance with applicable data
                      protection laws.
                    </p>
                    <p>
                      <strong>4.</strong> We are not responsible for any disputes between buyers and merchants. Refund requests are subject to
                      review and approval by the merchant. Please contact the merchant directly for product/service-related issues.
                    </p>
                    <p>
                      <strong>5.</strong> We reserve the right to update these terms at any time. Continued use of our services constitutes
                      acceptance of any changes.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-4">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{background: pc, color: "#fff", boxShadow: `0 4px 14px ${pc}40`}}
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Sticky Pay Button ──────────── */}
      {!selectedGw && panel === "gateway" && txn && (
        <div>
          <div className="hz-sticky-footer" style={{background: `${pc}dd`}}>
            <span className="text-lg font-bold" style={{color:"#fff"}}>
              Pay {txn.amount.toLocaleString(undefined, {minimumFractionDigits:2})} {txn.currency}
            </span>
          </div>
          <p className="text-[11px] text-center py-2 leading-relaxed" style={{color: "#9ca3af", background: "#f5f6f9"}}>
            By clicking the "Pay" button you agree to our{" "}
            <button onClick={() => setShowTermsModal(true)} className="underline font-medium hover:opacity-80 transition-opacity" style={{color: pc}}>
              Terms of Service
            </button>{" "}
            which is limited to facilitating your payment to {brand?.name || "UR BDT Pay"}.
          </p>
        </div>
      )}

      {/* ─── Sub-Option Modal ──────────── */}
      {showSubModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 hz-modal-backdrop" onClick={() => setShowSubModal(false)}>
          <div className="hz-sub-modal" style={{background: theme.card_bg_color}} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 px-1" style={{color: theme.text_color}}>Select Payment Option</h3>
            <div className="h-px mb-4" style={{background: theme.border_color}} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              {subOptions.map(gw => (
                <button key={gw.id} onClick={() => selectGw(gw)}
                  className="p-3 rounded-xl text-center transition-all border hover:shadow-md"
                  style={{borderColor: theme.border_color, background: theme.card_bg_color}}>
                  {(() => {
                    const logoUrl = gw.image_url || (gw.gateway_type);
                    return logoUrl ? (
                      <img src={logoUrl} alt={gw.display_name} className="max-h-[40px] mx-auto object-contain mb-2" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-sm font-bold mb-2" style={{background: pc, color:"#fff"}}>{gw.display_name.charAt(0)}</div>
                    );
                  })()}
                  <p className="text-sm font-medium" style={{color: theme.text_color}}>{gw.display_name}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowSubModal(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{background: theme.bg_color, color: pc}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
