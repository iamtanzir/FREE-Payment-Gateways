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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = getApiKey(req);
    if (!apiKey || apiKey.length < 10 || apiKey.length > 200) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify API key — match on 12-char prefix
    const keyPrefix = apiKey.substring(0, 12);
    const { data: apiKeyData } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .single();

    if (!apiKeyData) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify full key against stored hash (SHA-256; legacy base64 upgraded in place)
    if (!(await verifyApiKey(apiKey, apiKeyData.key_hash))) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isLegacyApiKeyHash(apiKeyData.key_hash)) {
      await supabase.from("api_keys").update({ key_hash: await hashApiKey(apiKey) }).eq("id", apiKeyData.id);
    }

    // Extract ref from query param or body
    const url = new URL(req.url);
    let ref = url.searchParams.get("ref");

    const body = await req.json().catch(() => ({}));
    if (!ref) {
      ref = body.ref || body.reference || body.transaction_id || null;
    }

    // Fallback: try last path segment
    if (!ref) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== "refund-payment") {
        ref = lastPart;
      }
    }

    if (!ref) {
      return new Response(JSON.stringify({ error: "Transaction reference required. Pass as ?ref=XXX query param or {\"ref\":\"XXX\"} in body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reason = body.reason || "Refund requested via API";

    // Find the transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("organization_id", apiKeyData.organization_id)
      .eq("reference", ref)
      .single();

    if (!transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (transaction.status === "refunded") {
      return new Response(JSON.stringify({ error: "Transaction already refunded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (transaction.status !== "completed") {
      return new Response(JSON.stringify({ error: "Only completed transactions can be refunded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status
    await supabase
      .from("transactions")
      .update({ status: "refunded" })
      .eq("id", transaction.id);

    // Create refund record
    await supabase.from("refunds").insert({
      organization_id: apiKeyData.organization_id,
      transaction_id: transaction.id,
      amount: transaction.amount,
      reason,
      status: "approved",
      processed_at: new Date().toISOString(),
    });

    // Fire webhook if configured
    const webhookUrl = (transaction.metadata as any)?.webhook_url;
    if (webhookUrl) {
      try {
        const webhookPayload = {
          event: "payment.refunded",
          ref: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          status: "refunded",
          refund_reason: reason,
          timestamp: new Date().toISOString(),
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        // Log webhook
        await supabase.from("webhook_logs").insert({
          organization_id: apiKeyData.organization_id,
          event_type: "payment.refunded",
          url: webhookUrl,
          payload: webhookPayload,
          response_status: webhookResponse.status,
          response_body: await webhookResponse.text().catch(() => null),
        });
      } catch (webhookError) {
        console.error("Webhook delivery failed:", webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ref: transaction.reference,
        status: "refunded",
        amount: transaction.amount,
        currency: transaction.currency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("refund-payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
