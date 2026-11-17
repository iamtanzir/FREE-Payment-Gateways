import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { hashApiKey, isLegacyApiKeyHash, verifyApiKey } from "../_shared/api-key.ts";

function getApiKey(req: Request): string | null {
  return req.headers.get("x-api-key")
    || req.headers.get("mhs-api-key")
    || req.headers.get("authorization")?.replace("Bearer ", "")
    || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Fix #2: Check method BEFORE body parsing
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = getApiKey(req);
    if (!apiKey || apiKey.length < 10 || apiKey.length > 200) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify API key — match on 12-char prefix
    const keyPrefix = apiKey.substring(0, 12);
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys").select("*")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify full key against stored hash (SHA-256; legacy base64 upgraded in place)
    if (!(await verifyApiKey(apiKey, apiKeyData.key_hash))) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at (and migrate a legacy hash on first successful use)
    const keyPatch: Record<string, unknown> = { last_used_at: new Date().toISOString() };
    if (isLegacyApiKeyHash(apiKeyData.key_hash)) keyPatch.key_hash = await hashApiKey(apiKey);
    await supabase.from("api_keys").update(keyPatch).eq("id", apiKeyData.id);

    const body = await req.json();
    const { amount, currency, customer, metadata, return_url, webhook_url } = body;

    // Support both field naming conventions (API docs vs actual)
    const customerData = customer || {};
    if (body.full_name && !customerData.name) customerData.name = body.full_name;
    if (body.email_address && !customerData.email) customerData.email = body.email_address;
    if (body.mobile_number && !customerData.mobile) customerData.mobile = body.mobile_number;

    // Validate required fields
    const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!parsedAmount || typeof parsedAmount !== "number" || parsedAmount <= 0 || parsedAmount > 10000000 || isNaN(parsedAmount)) {
      return new Response(JSON.stringify({ error: "Valid amount is required (0-10000000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate currency
    const safeCurrency = typeof currency === "string" ? currency.substring(0, 10).toUpperCase() : "BDT";

    // Validate URLs
    const finalReturnUrl = return_url || body.return_url || null;
    const finalWebhookUrl = webhook_url || body.webhook_url || null;
    if (finalReturnUrl && (typeof finalReturnUrl !== "string" || !finalReturnUrl.startsWith("http"))) {
      return new Response(JSON.stringify({ error: "Invalid return_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (finalWebhookUrl && (typeof finalWebhookUrl !== "string" || !finalWebhookUrl.startsWith("http"))) {
      return new Response(JSON.stringify({ error: "Invalid webhook_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate customer email
    if (customerData?.email && (typeof customerData.email !== "string" || customerData.email.length > 255 || !customerData.email.includes("@"))) {
      return new Response(JSON.stringify({ error: "Invalid customer email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that organization has at least one active gateway BEFORE creating a transaction
    const { count: activeGatewayCount } = await supabase
      .from("gateways")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", apiKeyData.organization_id)
      .eq("is_active", true);

    if (!activeGatewayCount || activeGatewayCount === 0) {
      // Log the failure for admin visibility
      await supabase.from("activity_logs").insert({
        organization_id: apiKeyData.organization_id,
        user_id: apiKeyData.organization_id, // service-side log; user_id required NOT NULL — use org id as placeholder
        action: "payment_gateway_error",
        entity_type: "transaction",
        details: {
          reason: "PAYMENT_GATEWAY_NOT_CONFIGURED",
          api_key_prefix: keyPrefix,
          attempted_amount: parsedAmount,
          currency: safeCurrency,
        },
      });
      return new Response(JSON.stringify({
        success: false,
        fallback: true,
        error: "PAYMENT_GATEWAY_NOT_CONFIGURED",
        message: "No active payment gateway found. Please configure at least one gateway in your dashboard.",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 27-digit numeric reference
    const now = Date.now().toString();
    const rand = Array.from({ length: 27 - now.length }, () => Math.floor(Math.random() * 10)).join("");
    const ref = now + rand;

    // Find or create customer
    let customerId = null;
    if (customerData?.email) {
      const safeEmail = customerData.email.trim().toLowerCase().substring(0, 255);
      const safeName = customerData.name ? String(customerData.name).substring(0, 100) : null;
      const safePhone = (customerData.mobile || customerData.phone) ? String(customerData.mobile || customerData.phone).substring(0, 20) : null;

      const { data: existingCustomer } = await supabase
        .from("customers").select("id")
        .eq("organization_id", apiKeyData.organization_id)
        .eq("email", safeEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            organization_id: apiKeyData.organization_id,
            email: safeEmail,
            name: safeName,
            phone: safePhone,
            created_from: "checkout",
          })
          .select("id").single();
        customerId = newCustomer?.id || null;
      }
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        organization_id: apiKeyData.organization_id,
        amount: parsedAmount,
        currency: safeCurrency,
        customer_id: customerId,
        reference: ref,
        status: "pending",
        metadata: {
          ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
          customer_info: customerData || {},
          return_url: finalReturnUrl,
          webhook_url: finalWebhookUrl,
          source: "api",
        },
      })
      .select().single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      return new Response(JSON.stringify({ error: "Failed to create payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutUrl = `${req.headers.get("origin") || "https://pay.example.com"}/payment/${ref}`;

    return new Response(
      JSON.stringify({
        success: true, ref, transaction_id: transaction.id, checkout_url: checkoutUrl, status: "pending",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
