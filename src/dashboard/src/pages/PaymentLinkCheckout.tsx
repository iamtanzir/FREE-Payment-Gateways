import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, XCircle, Loader2, LinkIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resolveCheckoutBrand } from "@/lib/checkout-brand";

interface PaymentLink {
  id: string; title: string; slug: string; amount: number; currency: string;
  product_description: string | null; quantity: number | null; is_active: boolean;
  expires_at: string | null; redirect_url: string | null; form_data: any; branding: any; organization_id: string;
  brand_id: string | null;
}
interface Brand { id: string; name: string; logo_url: string | null; primary_color: string | null; }

export default function PaymentLinkCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force light mode
  useEffect(() => {
    const prev = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => { if(prev) document.documentElement.classList.add("dark"); };
  }, []);

  useEffect(() => { if(slug) loadLink(); }, [slug]);

  const loadLink = async () => {
    try {
      const { data: pl } = await supabase.from("payment_links").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if(!pl) { setError("Payment link not found or inactive."); setLoading(false); return; }
      if(pl.expires_at && new Date(pl.expires_at) < new Date()) { setError("This payment link has expired."); setLoading(false); return; }
      if(pl.quantity !== null && pl.quantity !== 0 && pl.quantity <= 0) { setError("This payment link is sold out."); setLoading(false); return; }
      const paymentLink = pl as PaymentLink;
      setLink(paymentLink);
      const { brand: resolvedBrand } = await resolveCheckoutBrand({
        organizationId: paymentLink.organization_id,
        preferredBrandId: paymentLink.brand_id,
      });
      if(resolvedBrand) setBrand(resolvedBrand);
    } catch(err) { console.error(err); setError("Failed to load."); }
    finally { setLoading(false); }
  };

  const handleProceed = async () => {
    if(!link) return;
    const fields: Array<{label:string; required?:boolean}> = Array.isArray(link.form_data) ? link.form_data : [];
    for(const f of fields) { if(f.required && !formValues[f.label]?.trim()) { toast.error(`${f.label} is required`); return; } }
    setSubmitting(true);
    try {
      const { data: txn, error: txnErr } = await supabase.from("transactions").insert({
        organization_id: link.organization_id, amount: link.amount, currency: link.currency,
        payment_link_id: link.id, status: "pending",
        reference: `PL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
        metadata: {
          source:"payment_link",
          payment_link_slug:link.slug,
          payment_link_title:link.title,
          custom_fields:formValues,
          return_url:link.redirect_url||null,
          brand_id: link.brand_id || brand?.id || null,
        },
      }).select("reference").single();
      if(txnErr) { toast.error("Failed to create payment"); setSubmitting(false); return; }
      // Decrement quantity if tracked (quantity > 0 means limited stock)
      if(link.quantity && link.quantity > 0) {
        await supabase.from("payment_links").update({ quantity: link.quantity - 1 }).eq("id", link.id);
      }
      navigate(`/checkout/${txn.reference}`);
    } catch(err) { console.error(err); toast.error("Something went wrong."); }
    finally { setSubmitting(false); }
  };

  const pc = link?.branding?.primary_color || brand?.primary_color || "#1a56db";
  const customFields: Array<{label:string;type?:string;required?:boolean;placeholder?:string}> = Array.isArray(link?.form_data) ? link.form_data : [];

  if(loading) return (
    <div className="hz-page flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{borderColor: pc}} />
    </div>
  );

  if(error || !link) return (
    <div className="hz-page flex items-center justify-center">
      <div className="hz-card p-8 text-center max-w-md mx-4">
        <div className="hz-status-icon mx-auto" style={{background:"#fee2e2"}}><LinkIcon className="h-8 w-8" style={{color:"#dc2626"}} /></div>
        <h2 className="text-lg font-bold mt-2" style={{color:"#111827"}}>Unavailable</h2>
        <p className="text-sm mt-1" style={{color:"#9ca3af"}}>{error || "Payment link not found."}</p>
      </div>
    </div>
  );

  return (
    <div className="hz-page" style={{fontFamily:"'DM Sans', sans-serif"}}>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"24px 16px"}}>
        {/* Brand */}
        <div className="hz-brand mb-6">
          {brand?.logo_url ? <img src={brand.logo_url} alt={brand.name} className="h-10 w-10 rounded-xl object-cover" />
            : <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{background:pc, color:"#fff"}}>{(brand?.name||"P")[0]}</div>}
          <span className="text-lg font-bold" style={{color:"#111827"}}>{brand?.name||"Payment"}</span>
        </div>

        {/* Product Card */}
        <div className="hz-card mb-4">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${pc}15`}}>
                <ShoppingBag className="h-6 w-6" style={{color:pc}} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-1" style={{color:"#111827"}}>{link.title}</h1>
                {link.product_description && <p className="text-sm leading-relaxed" style={{color:"#6b7280"}}>{link.product_description}</p>}
              </div>
            </div>
            <div className="mt-5 p-4 rounded-xl" style={{background:`${pc}08`}}>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{color:"#6b7280"}}>Amount</span>
                <span className="text-2xl font-bold" style={{color:"#111827"}}>{link.amount} <span className="text-sm font-medium" style={{color:"#6b7280"}}>{link.currency}</span></span>
              </div>
              {link.quantity !== null && link.quantity > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2" style={{borderTop:"1px solid #f3f4f6"}}>
                  <span className="text-xs" style={{color:"#9ca3af"}}>Available</span>
                  <span className="text-xs" style={{color:"#6b7280"}}>{link.quantity} remaining</span>
                </div>
              )}
              {link.expires_at && (
                <div className="flex justify-between items-center mt-2 pt-2" style={{borderTop:"1px solid #f3f4f6"}}>
                  <span className="text-xs" style={{color:"#9ca3af"}}>Expires</span>
                  <span className="text-xs" style={{color:"#6b7280"}}>{new Date(link.expires_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="hz-card p-6 mb-4">
            <h3 className="text-sm font-semibold mb-4" style={{color:"#111827"}}>Your Information</h3>
            <div className="space-y-4">
              {customFields.map((f,i) => (
                <div key={i}>
                  <label className="block text-xs font-medium mb-1.5" style={{color:"#6b7280"}}>
                    {f.label}{f.required && <span style={{color:"#dc2626"}}> *</span>}
                  </label>
                  <input type={f.type||"text"} placeholder={f.placeholder||`Enter ${f.label.toLowerCase()}`}
                    value={formValues[f.label]||""} onChange={e => setFormValues(p => ({...p,[f.label]:e.target.value}))}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-shadow"
                    style={{border:"1px solid #e5e7eb", color:"#111827"}}
                    onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${pc}33`}
                    onBlur={e => e.target.style.boxShadow = "none"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button onClick={handleProceed} disabled={submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{background:pc, color:"#fff"}}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</> : `Proceed to Pay — ${link.amount} ${link.currency}`}
        </button>

        <div className="hz-footer" style={{color:"#9ca3af"}}>
          <ShieldCheck className="h-4 w-4" style={{color:"#16a34a"}} />
          <span>Secured by <strong>{brand?.name||"FREE Payment Gateways"}</strong></span>
        </div>
      </div>
    </div>
  );
}
