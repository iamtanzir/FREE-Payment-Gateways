import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { organization_id, license_type, customer_name, customer_email } = body;

    if (!organization_id || !license_type || !customer_name || !customer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["regular", "premium"].includes(license_type)) {
      return new Response(JSON.stringify({ error: "Invalid license_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is org member
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .limit(1)
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not authorized for this organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get license settings for pricing
    const { data: settings } = await supabase
      .from("license_settings")
      .select("regular_price, premium_price, default_currency, default_expiry_days")
      .eq("organization_id", organization_id)
      .maybeSingle();

    const regularPrice = settings?.regular_price ?? 49;
    const premiumPrice = settings?.premium_price ?? 149;
    const currency = settings?.default_currency ?? "USD";
    const expiryDays = settings?.default_expiry_days ?? 365;
    const amount = license_type === "premium" ? premiumPrice : regularPrice;

    // Generate reference
    const now = Date.now().toString();
    const rand = Array.from({ length: 27 - now.length }, () => Math.floor(Math.random() * 10)).join("");
    const ref = now + rand;

    // Find the FREE Payment Gateways admin org (the one that owns the license system)
    // For self-hosted, the admin org is the one with license_settings
    // We need to find the org that manages licenses - look for the org that has license_settings
    // In practice, the purchasing org IS the org buying, and the seller org manages licenses
    
    // For now, we create the transaction under the BUYER's org context
    // The admin will see it and can verify

    // Create transaction with license metadata
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        organization_id,
        amount,
        currency,
        status: "pending",
        reference: ref,
        metadata: {
          source: "license_purchase",
          license_type,
          customer_name,
          customer_email,
          expiry_days: expiryDays,
          max_domains: license_type === "premium" ? 5 : 1,
          buyer_org_id: organization_id,
          buyer_user_id: user.id,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      return new Response(JSON.stringify({ error: "Failed to create payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://pay.example.com";
    const checkoutUrl = `${origin}/checkout/${ref}`;

    return new Response(JSON.stringify({
      success: true,
      ref,
      transaction_id: transaction.id,
      checkout_url: checkoutUrl,
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("license-purchase error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
