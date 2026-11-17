import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveCheckoutBrand, type CheckoutBrand } from "@/lib/checkout-brand";

export default function DefaultPaymentLink() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const preferredBrandId = searchParams.get("brand_id");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<CheckoutBrand | null>(null);
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => { if (prev) document.documentElement.classList.add("dark"); };
  }, []);

  useEffect(() => {
    if (orgId) loadOrg();
  }, [orgId]);

  const loadOrg = async () => {
    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", orgId)
        .maybeSingle();

      if (!org) {
        setError("Organization not found.");
        setLoading(false);
        return;
      }
      setOrgName(org.name);

      const { brand: b } = await resolveCheckoutBrand({ organizationId: org.id, preferredBrandId });
      setBrand(b);
    } catch (err) {
      console.error(err);
      setError("Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { toast.error("Full Name is required"); return; }
    if (!email.trim()) { toast.error("Email Address is required"); return; }
    if (!mobile.trim()) { toast.error("Mobile Number is required"); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setSubmitting(true);
    try {
      // Find or create customer
      let customerId: string | null = null;
      const safeEmail = email.trim().toLowerCase();
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", orgId!)
        .eq("email", safeEmail)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            organization_id: orgId!,
            email: safeEmail,
            name: fullName.trim(),
            phone: mobile.trim(),
            created_from: "default_link",
          })
          .select("id")
          .single();
        customerId = newCustomer?.id || null;
      }

      const ref = `DL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { data: txn, error: txnErr } = await supabase
        .from("transactions")
        .insert({
          organization_id: orgId!,
          amount: amt,
          currency: "BDT",
          status: "pending",
          reference: ref,
          customer_id: customerId,
          metadata: {
            source: "default_link",
            customer_name: fullName.trim(),
            customer_email: safeEmail,
            customer_mobile: mobile.trim(),
            brand_id: brand?.id || null,
          },
        })
        .select("reference")
        .single();

      if (txnErr) {
        toast.error("Failed to create payment");
        setSubmitting(false);
        return;
      }
      navigate(`/checkout/${txn.reference}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const pc = brand?.primary_color || "#6C3FC5";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fc", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: pc }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fc", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-4">
          <h2 className="text-lg font-bold" style={{ color: "#111827" }}>Unavailable</h2>
          <p className="text-sm mt-2" style={{ color: "#9ca3af" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "#f8f9fc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: "440px", width: "100%" }}>
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="h-14 w-14 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md" style={{ background: pc, color: "#fff" }}>
              {(brand?.name || orgName || "P")[0]}
            </div>
          )}
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-6">
          <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="30" width="120" height="80" rx="12" fill={`${pc}15`} stroke={pc} strokeWidth="1.5"/>
            <rect x="55" y="50" width="50" height="8" rx="4" fill={`${pc}40`}/>
            <rect x="55" y="65" width="90" height="6" rx="3" fill={`${pc}20`}/>
            <rect x="55" y="78" width="70" height="6" rx="3" fill={`${pc}20`}/>
            <circle cx="145" cy="55" r="12" fill={`${pc}30`}/>
            <path d="M141 55l3 3 5-5" stroke={pc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="text-center mb-2">
              <h1 className="text-lg font-bold" style={{ color: "#111827" }}>{brand?.name || orgName}</h1>
              <p className="text-sm" style={{ color: "#9ca3af" }}>Enter your details to make a payment</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#111827" }}
                onFocus={(e) => (e.target.style.borderColor = pc)}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#111827" }}
                onFocus={(e) => (e.target.style.borderColor = pc)}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your mobile number"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#111827" }}
                onFocus={(e) => (e.target.style.borderColor = pc)}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#6b7280" }}>BDT</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="any"
                  className="w-full pl-14 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#111827" }}
                  onFocus={(e) => (e.target.style.borderColor = pc)}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: pc, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Processing..." : "Pay Now"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#9ca3af" }}>
          Secured by <span className="font-semibold">{brand?.name || orgName}</span>
        </p>
      </div>
    </div>
  );
}
