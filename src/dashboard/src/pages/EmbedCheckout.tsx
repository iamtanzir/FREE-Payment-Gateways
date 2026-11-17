import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, AlertCircle, RefreshCw, LifeBuoy } from "lucide-react";

/**
 * Embeddable checkout page — works inside iframes.
 * URL: /embed/pay?api_key=...&amount=500&currency=BDT&name=John&email=john@x.com&...
 * 
 * Flow:
 * 1. Reads params from URL
 * 2. Calls create-payment edge function
 * 3. Redirects to internal checkout page (within same frame)
 * 
 * Also supports postMessage API for dynamic params.
 */

interface EmbedError {
  title: string;
  message: string;
  fallback?: boolean;
}

export default function EmbedCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<EmbedError | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportEmail, setSupportEmail] = useState<string>("");

  // Load support email for "Contact Support" action
  useEffect(() => {
    supabase.from("settings").select("value").eq("name", "support_email").maybeSingle()
      .then(({ data }) => { if (data?.value) setSupportEmail(data.value); });
  }, []);

  // Force light mode
  useEffect(() => {
    const prev = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => { if (prev) document.documentElement.classList.add("dark"); };
  }, []);

  // Listen for postMessage (for JS SDK widget)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "fpg_create_payment") {
        createPayment(event.data.params);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Auto-create from URL params on mount
  useEffect(() => {
    const apiKey = searchParams.get("api_key");
    const amount = searchParams.get("amount");
    if (apiKey && amount) {
      createPayment({
        api_key: apiKey,
        amount: amount,
        currency: searchParams.get("currency") || "BDT",
        name: searchParams.get("name") || "",
        email: searchParams.get("email") || "",
        phone: searchParams.get("phone") || "",
        metadata: searchParams.get("metadata") || "{}",
        return_url: searchParams.get("return_url") || "",
        webhook_url: searchParams.get("webhook_url") || "",
      });
    } else if (!apiKey) {
      setError({ title: "Missing API Key", message: "The api_key parameter is required." });
      setLoading(false);
    } else {
      setError({ title: "Missing Amount", message: "The amount parameter is required." });
      setLoading(false);
    }
  }, []);

  const createPayment = async (params: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      let metadataObj = {};
      try { metadataObj = JSON.parse(params.metadata || "{}"); } catch { }

      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        headers: {
          "x-api-key": params.api_key,
          "Content-Type": "application/json",
        },
        body: {
          amount: params.amount,
          currency: params.currency || "BDT",
          customer: {
            name: params.name || undefined,
            email: params.email || undefined,
            mobile: params.phone || undefined,
          },
          metadata: { ...metadataObj, source: "embed_widget" },
          return_url: params.return_url || undefined,
          webhook_url: params.webhook_url || undefined,
        },
      });

      if (fnError || !data?.success) {
        const isGatewayMissing = data?.error === "PAYMENT_GATEWAY_NOT_CONFIGURED" || data?.fallback;
        setError({
          title: isGatewayMissing ? "Payment Gateway Not Configured" : "Payment Creation Failed",
          message: data?.message || data?.error || fnError?.message || "Could not create payment session.",
          fallback: isGatewayMissing,
        });
        setLoading(false);
        // Notify parent
        window.parent?.postMessage({ type: "fpg_error", error: data?.error || "Failed" }, "*");
        return;
      }

      // Notify parent of success
      window.parent?.postMessage({
        type: "fpg_payment_created",
        ref: data.ref,
        transaction_id: data.transaction_id,
        checkout_url: data.checkout_url,
      }, "*");

      // Navigate to checkout within the embed
      navigate(`/checkout/${data.ref}`);
    } catch (err: any) {
      setError({
        title: "Connection Error",
        message: "Could not connect to payment server. Please try again.",
      });
      setLoading(false);
      window.parent?.postMessage({ type: "fpg_error", error: "Connection failed" }, "*");
    }
  };

  if (error) {
    const lastParams = {
      api_key: searchParams.get("api_key") || "",
      amount: searchParams.get("amount") || "",
      currency: searchParams.get("currency") || "BDT",
      name: searchParams.get("name") || "",
      email: searchParams.get("email") || "",
      phone: searchParams.get("phone") || "",
      metadata: searchParams.get("metadata") || "{}",
      return_url: searchParams.get("return_url") || "",
      webhook_url: searchParams.get("webhook_url") || "",
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#f9fafb", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${error.fallback ? "bg-amber-50" : "bg-red-50"}`}>
            <AlertCircle className={`h-6 w-6 ${error.fallback ? "text-amber-500" : "text-red-500"}`} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{error.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setError(null); createPayment(lastParams); }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}?subject=Payment%20Checkout%20Issue&body=${encodeURIComponent(error.title + ": " + error.message)}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 transition-colors"
              >
                <LifeBuoy className="h-4 w-4" /> Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#f9fafb", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Preparing secure checkout...</p>
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
          <ShieldCheck className="h-3 w-3 text-green-500" />
          <span>Secured by FREE Payment Gateways</span>
        </div>
      </div>
    </div>
  );
}
