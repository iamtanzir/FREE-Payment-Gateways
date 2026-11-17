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
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify full key against stored hash (SHA-256; legacy base64 upgraded in place)
    if (!(await verifyApiKey(apiKey, apiKeyData.key_hash))) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isLegacyApiKeyHash(apiKeyData.key_hash)) {
      await supabase.from("api_keys").update({ key_hash: await hashApiKey(apiKey) }).eq("id", apiKeyData.id);
    }

    // Extract ref from query param, body, or path
    const url = new URL(req.url);
    let ref = url.searchParams.get("ref");

    if (!ref && req.method === "POST") {
      try {
        const body = await req.json();
        ref = body.ref || body.reference || body.transaction_id || null;
      } catch { /* no body */ }
    }

    if (!ref) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== "verify-payment") ref = lastPart;
    }

    if (!ref || typeof ref !== "string" || ref.length > 50) {
      return new Response(JSON.stringify({ error: "Valid transaction reference required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id, reference, amount, currency, status, metadata, created_at, updated_at,
        customer:customers(id, name, email, phone),
        gateway:gateways(id, display_name, gateway_type)
      `)
      .eq("organization_id", apiKeyData.organization_id)
      .eq("reference", ref)
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return safe data — exclude internal metadata (webhook_url, etc.)
    const txMeta = (transaction as any).metadata || {};
    const safeMeta: Record<string, any> = {};
    if (txMeta.customer_info) safeMeta.customer_info = txMeta.customer_info;
    if (txMeta.matched_trx_id) safeMeta.matched_trx_id = txMeta.matched_trx_id;
    if (txMeta.matched_sender) safeMeta.matched_sender = txMeta.matched_sender;
    if (txMeta.matched_at) safeMeta.matched_at = txMeta.matched_at;
    if (txMeta.matched_amount) safeMeta.matched_amount = txMeta.matched_amount;

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          ref: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          customer: transaction.customer,
          gateway: transaction.gateway,
          metadata: safeMeta,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
