import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = 4;
  const segLen = 4;
  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let seg = "";
    for (let j = 0; j < segLen; j++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(seg);
  }
  return parts.join("-");
}

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
    const { transaction_id, trx_id } = await req.json();

    if (!transaction_id || !trx_id) {
      return new Response(JSON.stringify({ error: "transaction_id and trx_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const trimmedTrxId = trx_id.trim();

    // Get the transaction
    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .select("id, amount, currency, status, metadata, organization_id, gateway_id, reference")
      .eq("id", transaction_id)
      .single();

    if (txnErr || !txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (txn.status !== "pending") {
      return new Response(JSON.stringify({ matched: txn.status === "completed", status: txn.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Duplicate TrxID Guard #1: SMS already used ──
    const { data: usedSms } = await supabase
      .from("sms_data")
      .select("id")
      .eq("organization_id", txn.organization_id)
      .ilike("transaction_id", trimmedTrxId)
      .eq("status", "used")
      .limit(1);

    if (usedSms && usedSms.length > 0) {
      return new Response(JSON.stringify({ matched: false, reason: "trx_id_already_used" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Duplicate TrxID Guard #2: Another transaction already claimed this TrxID ──
    const { data: otherTxns } = await supabase
      .from("transactions")
      .select("id, metadata")
      .eq("organization_id", txn.organization_id)
      .neq("id", transaction_id)
      .in("status", ["completed", "pending"])
      .limit(500);

    if (otherTxns) {
      const dup = otherTxns.find((t: any) => {
        const m = t.metadata as Record<string, any> | null;
        return m?.trx_id && m.trx_id.toLowerCase() === trimmedTrxId.toLowerCase();
      });
      if (dup) {
        return new Response(JSON.stringify({ matched: false, reason: "trx_id_already_used" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Search for matching approved SMS ──
    const { data: smsRecords } = await supabase
      .from("sms_data")
      .select("*")
      .eq("organization_id", txn.organization_id)
      .ilike("transaction_id", trimmedTrxId)
      .eq("status", "approved")
      .limit(1);

    if (!smsRecords || smsRecords.length === 0) {
      return new Response(JSON.stringify({ matched: false, reason: "no_sms_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sms = smsRecords[0];

    // Get tolerance setting
    const { data: tolSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("organization_id", txn.organization_id)
      .eq("name", "payment_tolerance")
      .maybeSingle();

    const tolerancePercent = tolSetting?.value ? parseFloat(tolSetting.value) : 0.5;
    const tolerance = txn.amount * (tolerancePercent / 100);
    const diff = Math.abs(txn.amount - (sms.amount || 0));

    if (diff > tolerance && diff > 1) {
      return new Response(JSON.stringify({ matched: false, reason: "amount_mismatch", expected: txn.amount, received: sms.amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Match found! Update transaction to completed ──
    const meta = txn.metadata as Record<string, any> || {};
    await supabase.from("transactions").update({
      status: "completed",
      metadata: {
        ...meta,
        auto_matched: true,
        sms_data_id: sms.id,
        matched_at: new Date().toISOString(),
        matched_sender: sms.sender,
        matched_trx_id: sms.transaction_id,
        matched_amount: sms.amount,
        reverse_matched: true,
      },
    }).eq("id", txn.id);

    // Mark SMS as used
    await supabase.from("sms_data").update({ status: "used" }).eq("id", sms.id);

    // ── Auto-activate license if this is a license purchase ──
    try {
      const txMeta = meta as Record<string, any>;
      if (txMeta?.source === "license_purchase") {
        const licenseKey = generateLicenseKey();
        const expiryDays = txMeta.expiry_days || 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        await supabase.from("licenses").insert({
          organization_id: txn.organization_id,
          license_key: licenseKey,
          customer_name: txMeta.customer_name || "Customer",
          customer_email: txMeta.customer_email || "",
          license_type: txMeta.license_type || "regular",
          status: "active",
          max_domains: txMeta.max_domains || 1,
          expires_at: expiresAt.toISOString(),
          activated_by_org_id: txMeta.buyer_org_id || txn.organization_id,
          payment_status: "paid",
          price_amount: txn.amount,
          price_currency: txn.currency,
          product: "FREE Payment Gateways",
          authorized_domains: [],
          api_domains: [],
        });

        console.log(`License auto-created: ${licenseKey} for org ${txn.organization_id}`);
      }
    } catch (licErr) {
      console.error("License auto-activation failed:", licErr);
    }

    // Create mfs_transaction if not already existing
    const { data: existingMfs } = await supabase
      .from("mfs_transactions")
      .select("id")
      .eq("transaction_id", sms.transaction_id || "")
      .eq("organization_id", txn.organization_id)
      .limit(1);

    if (!existingMfs || existingMfs.length === 0) {
      await supabase.from("mfs_transactions").insert({
        organization_id: txn.organization_id,
        brand_id: sms.brand_id,
        device_id: sms.device_id,
        transaction_id: sms.transaction_id || "",
        amount: sms.amount || 0,
        phone_number: sms.sender,
        payment_method: sms.provider || "bkash",
        status: "approved",
        ref: txn.reference,
        note: `Auto-matched (reverse) with transaction ${txn.reference}`,
      });
    }

    // Send webhook if configured
    try {
      const { data: webhookSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("organization_id", txn.organization_id)
        .eq("name", "webhook_url")
        .maybeSingle();

      if (webhookSetting?.value) {
        const payload = {
          event: "payment.completed",
          ref: txn.reference,
          amount: txn.amount,
          currency: txn.currency,
          status: "completed",
          sender_number: sms.sender,
          trx_id: sms.transaction_id,
          timestamp: new Date().toISOString(),
        };
        const resp = await fetch(webhookSetting.value, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await supabase.from("webhook_logs").insert({
          organization_id: txn.organization_id,
          event_type: "payment.completed",
          url: webhookSetting.value,
          payload,
          response_status: resp.status,
          response_body: await resp.text().catch(() => null),
        });
      }
    } catch (e) {
      console.error("Webhook delivery failed:", e);
    }

    return new Response(JSON.stringify({ matched: true, status: "completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("checkout-verify error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
