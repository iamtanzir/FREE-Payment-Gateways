import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Download, ExternalLink,
  Loader2, ShieldCheck, Home, X, HelpCircle, Headphones, Info, Printer
} from "lucide-react";
import jsPDF from "jspdf";
import { resolveCheckoutBrand } from "@/lib/checkout-brand";

interface Transaction {
  id: string; reference: string; amount: number; currency: string;
  status: string; metadata: any; created_at: string; gateway_id: string | null; organization_id: string;
  payment_link_id: string | null;
}
interface BrandInfo { id: string; name: string; logo_url: string | null; primary_color: string | null; }
interface Gateway { id: string; display_name: string; image_url: string | null; gateway_parameters: any; }
interface ThemeCfg {
  bg_color: string; card_bg_color: string; text_color: string; muted_color: string;
  border_color: string; accent_color: string; border_radius: string; card_shadow: string;
  font_family: string; button_radius: string; show_powered_by: string;
  watermark_text: string; footer_links: string;
  redirect_after_payment: string; redirect_delay: string;
}

const DEFAULTS: ThemeCfg = {
  bg_color:"#f5f6f9", card_bg_color:"#ffffff", text_color:"#111827", muted_color:"#9ca3af",
  border_color:"#e5e7eb", accent_color:"#1a56db", border_radius:"13", card_shadow:"sm",
  font_family:"DM Sans", button_radius:"8", show_powered_by:"true",
  watermark_text:"", footer_links:"",
  redirect_after_payment:"enabled", redirect_delay:"5",
};

const shadow = (s:string) => {
  if(s==="none") return "none"; if(s==="md") return "0 4px 6px -1px rgba(0,0,0,0.1)";
  if(s==="lg") return "0 10px 15px -3px rgba(0,0,0,0.1)"; return "0 1px 2px rgba(0,0,0,0.05)";
};

export default function CheckoutStatus() {
  const { ref } = useParams<{ ref: string }>();
  const [loading, setLoading] = useState(true);
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [gw, setGw] = useState<Gateway | null>(null);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [theme, setTheme] = useState<ThemeCfg>({...DEFAULTS});
  const [countdown, setCountdown] = useState<number | null>(null);

  // Transition states
  const prevStatusRef = useRef<string | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<"entering"|"visible"|"exiting"|"done">("done");

  // Force light mode
  useEffect(() => {
    const prev = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => { if(prev) document.documentElement.classList.add("dark"); };
  }, []);

  useEffect(() => { if(ref) loadData(); }, [ref]);

  // Realtime — detect status transitions
  useEffect(() => {
    if(!txn) return;
    const ch = supabase.channel(`txn-${txn.id}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"transactions",filter:`id=eq.${txn.id}`},
        p => {
          const newStatus = (p.new as any).status;
          const oldStatus = prevStatusRef.current;
          setTxn(prev => prev ? {...prev, ...p.new} : prev);
          if(oldStatus === "pending" && newStatus === "completed") {
            setShowTransition(true);
            setTransitionPhase("entering");
            setTimeout(() => setTransitionPhase("visible"), 50);
            setTimeout(() => setTransitionPhase("exiting"), 2000);
            setTimeout(() => { setShowTransition(false); setTransitionPhase("done"); }, 2600);
          }
          prevStatusRef.current = newStatus;
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [txn?.id]);

  useEffect(() => {
    if(txn) prevStatusRef.current = txn.status;
  }, [txn?.id]);

  // Auto-redirect countdown
  useEffect(() => {
    if(!txn) return;
    if(showTransition) return;
    const ret = (txn.metadata as any)?.return_url;
    if(!ret || (txn.status !== "completed" && txn.status !== "failed")) return;
    if(theme.redirect_after_payment === "disabled") return;
    const delay = parseInt(theme.redirect_delay) || 5;
    setCountdown(delay);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if(prev === null || prev <= 1) { clearInterval(iv); window.location.href = `${ret}?status=${txn.status}&ref=${txn.reference}`; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [txn?.status, txn?.metadata, showTransition]);

  const loadData = async () => {
    try {
      const { data: t } = await supabase.from("transactions").select("*").eq("reference", ref).maybeSingle();
      if(!t) { setLoading(false); return; }
      setTxn(t);

      const [gwR, brandResolution] = await Promise.all([
        t.gateway_id ? supabase.from("gateways").select("*").eq("id", t.gateway_id).single() : Promise.resolve({data:null}),
        resolveCheckoutBrand({
          organizationId: t.organization_id,
          paymentLinkId: t.payment_link_id,
          gatewayId: t.gateway_id,
          preferredBrandId: (t.metadata as any)?.brand_id || null,
        }),
      ]);
      const { brand: resolvedBrand, brandId: resolvedBrandId } = brandResolution;

      if(gwR.data) setGw(gwR.data as any);
      if(resolvedBrand) setBrand(resolvedBrand);

      if(resolvedBrandId) {
        const { data: td } = await supabase.from("theme_settings").select("name, value").eq("organization_id", t.organization_id).eq("brand_id", resolvedBrandId);
        if(td && td.length > 0) {
          const loaded = {...DEFAULTS}; if(resolvedBrand?.primary_color) loaded.accent_color = resolvedBrand.primary_color;
          td.forEach(s => { if(s.name in loaded && s.value) (loaded as any)[s.name] = s.value; }); setTheme(loaded);
        } else if(resolvedBrand?.primary_color) setTheme(prev => ({...prev, accent_color: resolvedBrand.primary_color!}));
      }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleReceipt = async () => {
    if(!txn) return;
    const doc = new jsPDF({unit:"mm",format:"a4"}); const w = doc.internal.pageSize.getWidth();
    const meta = txn.metadata||{};
    const statusLabels: Record<string,string> = {completed:"Payment Successful",pending:"Payment Pending",failed:"Payment Failed",refunded:"Payment Refunded"};
    const statusLabel = statusLabels[txn.status]||"Unknown";
    const hex = theme.accent_color||"#1a56db";
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);

    doc.setFillColor(r,g,b); doc.rect(0,0,w,48,"F");
    let hy = 16;
    if(brand?.logo_url) {
      try {
        const img = new Image(); img.crossOrigin="anonymous";
        await new Promise<void>((res,rej) => { img.onload=()=>res(); img.onerror=()=>rej(); img.src=brand.logo_url!; });
        const c = document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
        c.getContext("2d")!.drawImage(img,0,0);
        const lH=10, lW=(img.naturalWidth/img.naturalHeight)*lH;
        doc.addImage(c.toDataURL("image/png"),"PNG",(w-lW)/2,6,lW,lH); hy=22;
      } catch {}
    }
    doc.setFont("helvetica","bold"); doc.setFontSize(brand?.logo_url?10:14); doc.setTextColor(255,255,255);
    doc.text(brand?.name||"FREE Payment Gateways",w/2,hy,{align:"center"});
    doc.setFontSize(16); doc.text("Payment Receipt",w/2,hy+9,{align:"center"});
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(255,255,255);
    doc.text(statusLabel,w/2,hy+17,{align:"center"});

    doc.setFillColor(245,246,249); doc.rect(0,48,w,12,"F");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(156,163,175);
    doc.text("REFERENCE",25,55); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
    doc.text(txn.reference||"",w-25,55,{align:"right"});

    doc.setDrawColor(229,231,235); doc.line(20,62,w-20,62);
    let y=72; const lx=25, rx=w-25;
    const row = (l:string,v:string) => {
      doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(107,114,128); doc.text(l,lx,y);
      doc.setFont("helvetica","bold"); doc.setTextColor(17,24,39); doc.text(v,rx,y,{align:"right"}); y+=9;
    };
    row("Amount",`${txn.amount} ${txn.currency}`); row("Status",statusLabel);
    if(gw) row("Gateway",gw.display_name);
    if(meta.sender_number) row("Sender",meta.sender_number);
    if(meta.trx_id) row("TrxID",meta.trx_id);
    row("Date",new Date(txn.created_at).toLocaleString());

    y+=4; doc.setDrawColor(229,231,235); doc.line(20,y,w-20,y); y+=10;
    doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(17,24,39); doc.text("Total Paid",lx,y);
    doc.setTextColor(r,g,b); doc.text(`${txn.amount} ${txn.currency}`,rx,y,{align:"right"});
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(156,163,175);
    doc.text(`Powered by ${brand?.name||"FREE Payment Gateways"}`,w/2,280,{align:"center"});
    doc.save(`receipt-${txn.reference}.pdf`);
  };

  const pc = theme.accent_color || "#1a56db";
  const cs: React.CSSProperties = { background:theme.card_bg_color, borderRadius:`${theme.border_radius}px`, border:`1px solid ${theme.border_color}`, boxShadow:shadow(theme.card_shadow) };

  if(loading) return (
    <div className="hz-page flex items-center justify-center" style={{background:theme.bg_color}}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{borderColor:pc}} />
    </div>
  );

  if(!txn) return (
    <div className="hz-page flex items-center justify-center" style={{background:theme.bg_color}}>
      <div className="hz-card p-8 text-center max-w-md mx-4">
        <XCircle className="h-12 w-12 mx-auto mb-3" style={{color:"#dc2626"}} />
        <h2 className="text-lg font-semibold" style={{color:theme.text_color}}>Transaction Not Found</h2>
      </div>
    </div>
  );

  const statusCfg: Record<string,{icon:any;color:string;bg:string;title:string;desc:string}> = {
    completed:{icon:CheckCircle, color:"#16a34a", bg:"#dcfce7", title:"Payment Successful!", desc:"Your payment has been confirmed."},
    pending:{icon:Clock, color:"#ca8a04", bg:"#fef9c3", title:"Payment Pending", desc:"Your payment is being processed."},
    failed:{icon:XCircle, color:"#dc2626", bg:"#fee2e2", title:"Payment Failed", desc:"This payment could not be completed."},
    refunded:{icon:AlertCircle, color:"#7c3aed", bg:"#ede9fe", title:"Payment Refunded", desc:"This payment has been refunded."},
  };
  const cfg = statusCfg[txn.status] || statusCfg.pending;
  const Icon = cfg.icon;
  const meta = txn.metadata || {};

  return (
    <div className="hz-page hz-page-pattern" style={{background:theme.bg_color, fontFamily:`'${theme.font_family}', sans-serif`}}>

      {/* ===== SUCCESS TRANSITION OVERLAY ===== */}
      {showTransition && (
        <div className={`hz-transition-overlay ${transitionPhase === "exiting" ? "hz-transition-exit" : ""}`}
          style={{background:theme.bg_color}}>
          <div className="hz-transition-content">
            <div className="hz-success-ring">
              <div className="hz-success-ring-inner">
                <CheckCircle className="h-12 w-12" style={{color:"#16a34a"}} />
              </div>
            </div>
            <h2 className="hz-transition-title" style={{color:theme.text_color}}>Payment Verified!</h2>
            <p className="hz-transition-subtitle" style={{color:theme.muted_color}}>
              Your transaction has been confirmed successfully
            </p>
            <div className="hz-confetti-container">
              {[...Array(12)].map((_,i) => (
                <div key={i} className="hz-confetti-dot" style={{
                  left:`${10+Math.random()*80}%`,
                  animationDelay:`${i*0.1}s`,
                  background:["#16a34a","#1a56db","#ca8a04","#7c3aed","#dc2626","#0891b2"][i%6],
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="hz-wrap pb-8">

        {/* ─── Top Bar (matching Checkout) ─── */}
        <div className="hz-card mb-6">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => window.history.back()}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{color: theme.muted_color}}>
              <Home className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="w-9 h-9 rounded-lg flex items-center justify-center print:hidden" style={{color: theme.muted_color}}>
                <Printer className="h-5 w-5" />
              </button>
              {meta.return_url && (
                <a href={`${meta.return_url}?status=${txn.status}&ref=${txn.reference}`}
                  className="w-9 h-9 rounded-lg flex items-center justify-center" style={{color: theme.muted_color}}>
                  <X className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ─── Brand Logo Centered ────────── */}
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
          <h2 className="text-xl font-semibold mt-3" style={{color: theme.text_color}}>{brand?.name || "FREE Payment Gateways"}</h2>
        </div>

        {/* ─── Status Card ───────────────── */}
        <div className="overflow-hidden" style={cs}>

          {/* Status Hero */}
          <div className="px-6 py-8 text-center" style={{borderBottom:`1px solid ${theme.border_color}`}}>
            <div className="mx-auto mb-4 w-[68px] h-[68px] rounded-full flex items-center justify-center"
              style={{background:`${cfg.color}15`, border:`2.5px solid ${cfg.color}`}}>
              <Icon className="h-7 w-7" style={{color:cfg.color}} />
            </div>
            <div className="text-[11px] font-bold tracking-[0.9px] uppercase mb-1.5" style={{color:theme.muted_color}}>
              Payment Receipt
            </div>
            <div className="text-[36px] font-bold tracking-tight leading-none" style={{color:theme.text_color}}>
              {txn.amount} <span className="text-base font-medium" style={{color:theme.muted_color}}>{txn.currency}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full text-xs font-bold"
              style={{color:cfg.color, background:`${cfg.color}12`, border:`1px solid ${cfg.color}30`}}>
              <Icon className="h-3.5 w-3.5" /> {cfg.title}
            </div>

            {/* Verifying indicator for pending */}
            {txn.status === "pending" && (
              <div className="hz-verifying-indicator mt-4">
                <div className="hz-verifying-dots">
                  <span className="hz-verifying-dot" style={{background:"#ca8a04"}} />
                  <span className="hz-verifying-dot" style={{background:"#ca8a04", animationDelay:"0.2s"}} />
                  <span className="hz-verifying-dot" style={{background:"#ca8a04", animationDelay:"0.4s"}} />
                </div>
                <span className="text-xs font-medium mt-2 block" style={{color:"#ca8a04"}}>
                  Waiting for verification...
                </span>
              </div>
            )}
          </div>

          {/* Reference bar */}
          <div className="flex items-center justify-between px-5 py-3" style={{background:theme.bg_color, borderBottom:`1px solid ${theme.border_color}`}}>
            <span className="text-[11px] font-bold tracking-[0.7px] uppercase" style={{color:theme.muted_color}}>Reference</span>
            <span className="font-mono text-xs font-semibold" style={{color:theme.muted_color}}>{txn.reference}</span>
          </div>

          {/* Auto-redirect banner */}
          {countdown !== null && countdown > 0 && meta.return_url && (
            <div className="flex items-center justify-center gap-3 py-3 px-4" style={{background:`${pc}10`, borderBottom:`1px solid ${theme.border_color}`}}>
              <Loader2 className="h-4 w-4 animate-spin" style={{color:pc}} />
              <span className="text-sm" style={{color:theme.text_color}}>Redirecting in</span>
              <div className="hz-countdown-badge" style={{background:pc}}>{countdown}</div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="px-5 pt-4 pb-1">
            <div className="text-[11px] font-bold tracking-[0.8px] uppercase mb-3 flex items-center gap-1.5" style={{color:theme.muted_color}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              Transaction Details
            </div>
            {[
              ["Amount", `${txn.amount} ${txn.currency}`],
              ["Status", cfg.title],
              ...(gw ? [["Gateway", gw.display_name]] : []),
              ...(meta.sender_number ? [["Sender", meta.sender_number]] : []),
              ...(meta.trx_id ? [["TrxID", meta.trx_id]] : []),
              ["Date", new Date(txn.created_at).toLocaleString()],
            ].map(([label, value], i) => (
              <div key={i} className="flex justify-between items-center py-2.5 text-[13.5px]" style={{borderBottom:`1px solid ${theme.border_color}20`}}>
                <span style={{color:theme.muted_color}}>{label}</span>
                <span className="font-semibold text-right" style={{color:theme.text_color}}>{value}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <hr className="mx-5 mt-2" style={{border:"none", borderTop:`2px solid ${theme.text_color}`}} />
          <div className="flex justify-between items-center px-5 py-3.5 text-[15px] font-bold">
            <span style={{color:theme.text_color}}>Total Paid</span>
            <span className="text-lg" style={{color:pc}}>{txn.amount} {txn.currency}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 px-5 py-4 print:hidden" style={{borderTop:`1px solid ${theme.border_color}`}}>
            {(txn.status==="completed" || txn.status==="pending" || txn.status==="refunded" || txn.status==="failed") && (
              <button onClick={handleReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{borderRadius:`${theme.button_radius}px`, background:"#16a34a", color:"#fff"}}>
                <Download className="h-4 w-4" /> Download Receipt
              </button>
            )}
            {meta.return_url && (txn.status==="completed" || txn.status==="failed") && (
              <a href={`${meta.return_url}?status=${txn.status}&ref=${txn.reference}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{borderRadius:`${theme.button_radius}px`, background:pc, color:"#fff"}}>
                <ExternalLink className="h-4 w-4" /> Return
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        {theme.show_powered_by==="true" && (
          <div className="flex items-center justify-center gap-2 mt-5 text-xs" style={{color:theme.muted_color}}>
            <ShieldCheck className="h-4 w-4" style={{color:"#16a34a"}} />
            <span>{theme.watermark_text || <>Secured by <strong>{brand?.name||"FREE Payment Gateways"}</strong></>}</span>
          </div>
        )}
        {theme.footer_links && (
          <p className="text-center text-[11px] mt-1.5" style={{color:theme.muted_color}}
            dangerouslySetInnerHTML={{__html: theme.footer_links}} />
        )}
      </div>
    </div>
  );
}
