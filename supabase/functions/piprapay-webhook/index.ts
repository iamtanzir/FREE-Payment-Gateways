import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, user-agent, mh-piprapay-api-key, mhs-piprapay-api-key",
};

interface ParsedSms {
  amount: number | null;
  trx_id: string | null;
  sender_number: string | null;
  balance: number | null;
  provider: string | null;
  type: string;
}

function parseSms(message: string, senderHint?: string): ParsedSms {
  const result: ParsedSms = {
    amount: null, trx_id: null, sender_number: null, balance: null, provider: null, type: "unknown",
  };
  const msg = message.trim();
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("bkash") || senderHint?.toLowerCase().includes("bkash")) result.provider = "bkash";
  else if (lowerMsg.includes("nagad") || senderHint?.toLowerCase().includes("nagad")) result.provider = "nagad";
  else if (lowerMsg.includes("rocket") || senderHint?.toLowerCase().includes("rocket")) result.provider = "rocket";
  else if (lowerMsg.includes("mcash") || senderHint?.toLowerCase().includes("mcash")) result.provider = "mcash";

  const bkashReceived = msg.match(/received\s+Tk\s*([\d,]+(?:\.\d+)?)\s*from\s*(01\d{9})\b.*?TrxID\s+(\w+)/i);
  if (bkashReceived) {
    result.amount = parseFloat(bkashReceived[1].replace(/,/g, ""));
    result.sender_number = bkashReceived[2];
    result.trx_id = bkashReceived[3];
    result.type = "cash_in";
  }

  if (!result.trx_id) {
    const bkashPayment = msg.match(/Payment\s+(?:of\s+)?Tk\s*([\d,]+(?:\.\d+)?)\s*from\s*(01\d{9})\b.*?TrxID\s+(\w+)/i);
    if (bkashPayment) {
      result.amount = parseFloat(bkashPayment[1].replace(/,/g, ""));
      result.sender_number = bkashPayment[2];
      result.trx_id = bkashPayment[3];
      result.type = "payment";
    }
  }

  if (!result.trx_id) {
    const bkashCashIn = msg.match(/Cash\s*In\s+Tk\s*([\d,]+(?:\.\d+)?)\s*from\s*(01\d{9})\b.*?TrxID\s+(\w+)/i);
    if (bkashCashIn) {
      result.amount = parseFloat(bkashCashIn[1].replace(/,/g, ""));
      result.sender_number = bkashCashIn[2];
      result.trx_id = bkashCashIn[3];
      result.type = "cash_in";
    }
  }

  if (!result.trx_id) {
    const nagadReceived = msg.match(/received\s+Tk\.?\s*([\d,]+(?:\.\d+)?)\s*from\s*(01\d{9})\b.*?(?:TxnID|TrxID|Txn\s*ID)\s*[:\s]*(\w+)/i);
    if (nagadReceived) {
      result.amount = parseFloat(nagadReceived[1].replace(/,/g, ""));
      result.sender_number = nagadReceived[2];
      result.trx_id = nagadReceived[3];
      result.type = "cash_in";
    }
  }

  if (!result.trx_id) {
    const amountMatch = msg.match(/(?:Tk\.?|BDT|Taka)\s*([\d,]+(?:\.\d+)?)/i);
    if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    const trxMatch = msg.match(/(?:TrxID|TxnID|Txn\s*ID|Transaction\s*ID)[:\s]*(\w+)/i);
    if (trxMatch) result.trx_id = trxMatch[1];
    const phoneMatch = msg.match(/(?:from|to)\s*(01\d{9})\b/i);
    if (phoneMatch) result.sender_number = phoneMatch[1];
  }

  const balanceMatch = msg.match(/(?:balance|bal)[:\s]*(?:is\s+)?(?:Tk\.?|BDT)?\s*([\d,]+(?:\.\d+)?)/i);
  if (balanceMatch) result.balance = parseFloat(balanceMatch[1].replace(/,/g, ""));

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const headerWebhookKey = (req.headers.get("mh-piprapay-api-key") || req.headers.get("mhs-piprapay-api-key"))?.trim() || "";
    const queryWebhookKey = url.searchParams.get("key")?.trim() || "";
    const webhookKey = headerWebhookKey || queryWebhookKey;
    const authSource = headerWebhookKey ? "header" : queryWebhookKey ? "query" : "missing";

    if (!webhookKey) {
      return new Response(JSON.stringify({ error: "Missing key parameter or MHS-PIPRAPAY-API-KEY header" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, organization_id, is_active, brand_id")
      .eq("webhook_key", webhookKey)
      .single();

    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!device.is_active) {
      return new Response(JSON.stringify({ error: "Device is inactive" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        body = await req.json().catch(() => ({}));
      } else {
        const raw = await req.text().catch(() => "");
        if (raw.trim()) {
          try { body = JSON.parse(raw); } catch { body = Object.fromEntries(new URLSearchParams(raw).entries()); }
        }
      }
    }

    const from = (body.from ?? body.sender ?? "") as string;
    const text = (body.text ?? body.message ?? "") as string;
    const d_model = (body.d_model ?? body.device_model ?? body.model ?? "") as string;
    const d_brand = (body.d_brand ?? body.device_brand ?? body.brand ?? "") as string;
    const d_version = (body.d_version ?? body.device_version ?? body.version ?? "") as string;
    const d_api_level = (body.d_api_level ?? body.device_api_level ?? body.api_level ?? "") as string;

    const smsDataArray = body.sms_data as Array<Record<string, unknown>> | undefined;

    console.log("PipraPay webhook hit", {
      method: req.method,
      device_id: device.id,
      auth_source: authSource,
      has_sms: Boolean(from || text || smsDataArray),
      has_device_info: Boolean(d_model || d_brand),
    });

    // Update device info
    const deviceUpdate: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      status: "online",
    };
    if (d_model) deviceUpdate.device_model = d_model;
    if (d_brand) deviceUpdate.device_brand = d_brand;
    if (d_version) deviceUpdate.device_version = d_version;
    if (d_api_level) deviceUpdate.device_api_level = d_api_level;

    await supabase.from("devices").update(deviceUpdate).eq("id", device.id);

    // Health check / heartbeat
    if (req.method === "GET" || req.method === "HEAD" || (!from && !text && !smsDataArray)) {
      return new Response(JSON.stringify({
        success: true,
        message: req.method === "POST" ? "Device info updated" : "Webhook reachable",
        device_id: device.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Collect SMS items (single or array)
    const smsItems: Array<{ sender: string; message: string }> = [];
    if (smsDataArray && Array.isArray(smsDataArray)) {
      for (const item of smsDataArray) {
        const s = (item.sender ?? item.from ?? "") as string;
        const m = (item.message ?? item.text ?? "") as string;
        if (m) smsItems.push({ sender: s || "unknown", message: m });
      }
    } else if (text) {
      smsItems.push({ sender: from || "unknown", message: text });
    }

    if (smsItems.length === 0) {
      return new Response(JSON.stringify({ error: "No SMS data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const smsItem of smsItems) {
      const parsed = parseSms(smsItem.message, smsItem.sender);

      let smsStatus = "pending";
      if (parsed.amount && parsed.trx_id) smsStatus = "approved";
      else if (!parsed.amount && !parsed.trx_id) smsStatus = "error";

      const { data: smsData, error: smsError } = await supabase
        .from("sms_data")
        .insert({
          organization_id: device.organization_id,
          device_id: device.id,
          brand_id: device.brand_id,
          sender: smsItem.sender,
          message: smsItem.message,
          amount: parsed.amount,
          provider: parsed.provider,
          transaction_id: parsed.trx_id,
          status: smsStatus,
          parsed_at: smsStatus === "approved" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (smsError) {
        console.error("SMS insert error:", smsError);
        results.push({ error: "Failed to store SMS", sender: smsItem.sender });
        continue;
      }

      // Auto-match with pending transactions
      let matched = false;
      if (parsed.trx_id && parsed.amount && smsStatus === "approved") {
        const { data: pendingTxns } = await supabase
          .from("transactions")
          .select("*")
          .eq("organization_id", device.organization_id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50);

        if (pendingTxns) {
          const { data: tolSetting } = await supabase
            .from("settings")
            .select("value")
            .eq("organization_id", device.organization_id)
            .eq("name", "payment_tolerance")
            .maybeSingle();

          const tolerancePercent = tolSetting?.value ? parseFloat(tolSetting.value) : 0.5;

          for (const txn of pendingTxns) {
            const meta = (txn.metadata as Record<string, unknown>) || {};
            const txnTrxId = (meta.trx_id || meta.transaction_id || "") as string;

            if (txnTrxId && txnTrxId.toLowerCase() === parsed.trx_id!.toLowerCase()) {
              const tolerance = txn.amount * (tolerancePercent / 100);
              const diff = Math.abs(txn.amount - parsed.amount!);
              if (diff <= tolerance || diff <= 1) {
                await supabase.from("transactions").update({
                  status: "completed",
                  metadata: {
                    ...meta, auto_matched: true, sms_data_id: smsData.id,
                    matched_at: new Date().toISOString(),
                    matched_sender: parsed.sender_number, matched_trx_id: parsed.trx_id, matched_amount: parsed.amount,
                  },
                }).eq("id", txn.id);

                await supabase.from("sms_data").update({ status: "used" }).eq("id", smsData.id);

                const wUrl = meta.webhook_url as string | undefined;
                if (wUrl) {
                  try {
                    const payload = {
                      event: "payment.completed", ref: txn.reference, amount: txn.amount,
                      currency: txn.currency, status: "completed",
                      sender_number: parsed.sender_number || smsItem.sender,
                      trx_id: parsed.trx_id, timestamp: new Date().toISOString(),
                    };
                    const resp = await fetch(wUrl, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    await supabase.from("webhook_logs").insert({
                      organization_id: device.organization_id, event_type: "payment.completed",
                      url: wUrl, payload, response_status: resp.status,
                      response_body: await resp.text().catch(() => null),
                    });
                  } catch (e) {
                    console.error("Webhook delivery failed:", e);
                  }
                }
                matched = true;
                break;
              }
            }

            // Amount-based matching
            if (!txnTrxId && !matched && txn.gateway_id) {
              const tolerance = txn.amount * (tolerancePercent / 100);
              const diff = Math.abs(txn.amount - parsed.amount!);
              if (diff <= tolerance || diff <= 1) {
                const { data: gw } = await supabase.from("gateways").select("gateway_type").eq("id", txn.gateway_id).single();
                if (gw && parsed.provider && gw.gateway_type.toLowerCase().includes(parsed.provider.toLowerCase())) {
                  await supabase.from("transactions").update({
                    status: "completed",
                    metadata: {
                      ...meta, auto_matched: true, match_type: "amount_gateway",
                      sms_data_id: smsData.id, matched_at: new Date().toISOString(),
                      matched_sender: parsed.sender_number, matched_trx_id: parsed.trx_id, matched_amount: parsed.amount,
                    },
                  }).eq("id", txn.id);
                  await supabase.from("sms_data").update({ status: "used" }).eq("id", smsData.id);
                  matched = true;
                  break;
                }
              }
            }
          }
        }
      }

      // Store MFS transaction
      if (smsStatus === "approved" && parsed.amount && parsed.trx_id) {
        await supabase.from("mfs_transactions").insert({
          organization_id: device.organization_id,
          device_id: device.id,
          brand_id: device.brand_id,
          payment_method: parsed.provider || "unknown",
          transaction_id: parsed.trx_id,
          amount: parsed.amount,
          balance: parsed.balance || 0,
          phone_number: parsed.sender_number || "",
          status: matched ? "matched" : "approved",
        });
      }

      results.push({
        sms_id: smsData.id, matched, parsed: {
          amount: parsed.amount, trx_id: parsed.trx_id, provider: parsed.provider, balance: parsed.balance,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("PipraPay webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
