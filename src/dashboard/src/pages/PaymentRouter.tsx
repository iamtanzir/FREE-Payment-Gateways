import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Checkout from "./Checkout";
import CheckoutStatus from "./CheckoutStatus";
import { AlertCircle, RefreshCw, LifeBuoy } from "lucide-react";

/**
 * /payment/:ref — unified route that shows Checkout if status is pending/initiated,
 * or CheckoutStatus if completed/failed/refunded.
 */
export default function PaymentRouter() {
  const { ref } = useParams<{ ref: string }>();
  const [status, setStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gatewayMissing, setGatewayMissing] = useState(false);
  const [supportEmail, setSupportEmail] = useState<string>("");

  useEffect(() => {
    if (!ref) return;

    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("status, metadata, organization_id")
        .eq("reference", ref)
        .maybeSingle();
      setStatus(data?.status || null);
      setSubmitted(!!(data?.metadata as any)?.submitted_at);

      // If transaction exists but org has no active gateway, surface a friendly fallback
      if (data?.organization_id && data.status === "pending") {
        const { count } = await supabase
          .from("gateways")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", data.organization_id)
          .eq("is_active", true);
        if (!count || count === 0) setGatewayMissing(true);
      }

      // Load support email
      const { data: s } = await supabase.from("settings").select("value").eq("name", "support_email").maybeSingle();
      if (s?.value) setSupportEmail(s.value);

      setLoading(false);
    };
    load();

    // Realtime subscription for status changes
    const channel = supabase
      .channel(`payment-router-${ref}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `reference=eq.${ref}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus) {
            setStatus(newStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ref]);

  if (loading) {
    return (
      <div className="hz-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // Transaction not found
  if (status === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold text-foreground">Payment Not Found</h1>
        <p className="text-muted-foreground text-center max-w-md">
          The payment reference <span className="font-mono font-semibold">{ref}</span> does not exist or has been removed.
        </p>
      </div>
    );
  }

  // No active gateway — friendly fallback (replaces blank/red checkout)
  if (gatewayMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-sm w-full bg-card rounded-2xl shadow-sm border p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6 text-warning" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Payment Gateway Not Configured</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This merchant has no active payment gateway yet. Please contact support or try again later.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2.5 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}?subject=Payment%20Checkout%20Issue&body=${encodeURIComponent("Reference: " + ref)}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border hover:bg-muted text-foreground text-sm font-medium py-2.5 transition-colors"
              >
                <LifeBuoy className="h-4 w-4" /> Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show checkout only if pending AND not yet submitted by customer
  if (status === "pending" && !submitted) {
    return <Checkout />;
  }

  return <CheckoutStatus />;
}
