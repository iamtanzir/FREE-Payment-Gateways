import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// SMS Parsing Engine - bKash, Nagad, Rocket, mCash patterns
interface ParsedSms {
  amount: number | null;
  trx_id: string | null;
  sender_number: string | null;
  balance: number | null;
  provider: string | null;
  type: "cash_in" | "payment" | "send_money" | "unknown";
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

// Input validation helpers
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function sanitizeString(str: string, maxLen: number): string {
  return String(str).substring(0, maxLen).replace(/[<>]/g, "");
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
    // Authentication: require either a valid JWT or a device webhook_key
    const authHeader = req.headers.get("Authorization");
    const webhookKeyHeader = req.headers.get("x-webhook-key") || req.headers.get("webhook-key");
    let authenticatedVia: "jwt" | "webhook_key" | null = null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try JWT auth first (used by Capacitor app via supabase.functions.invoke)
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (token !== anonKey) {
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: userError } = await anonClient.auth.getUser();
        if (!userError && user?.id) {
          authenticatedVia = "jwt";
        }
      }
    }

    const body = await req.json();
    const { device_id, sender, message, amount: rawAmount, transaction_id: rawTrxId, phone_number, provider: rawProvider, type: requestType } = body;

    // Validate device_id format
    if (device_id && !isValidUUID(device_id)) {
      return new Response(JSON.stringify({ error: "Invalid device_id format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If not JWT-authenticated, require webhook_key from header or body
    if (!authenticatedVia) {
      const webhookKey = webhookKeyHeader || body.webhook_key;
      if (!webhookKey || typeof webhookKey !== "string" || webhookKey.length < 10) {
        return new Response(JSON.stringify({ error: "Authentication required. Provide a valid JWT token or device webhook_key." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!device_id) {
        return new Response(JSON.stringify({ error: "device_id is required when using webhook_key auth" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify webhook_key belongs to this device
      const { data: keyDevice } = await supabase
        .from("devices")
        .select("id, webhook_key")
        .eq("id", device_id)
        .single();

      if (!keyDevice || keyDevice.webhook_key !== webhookKey) {
        return new Response(JSON.stringify({ error: "Invalid webhook_key for this device" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedVia = "webhook_key";
    }

    // Handle heartbeat ping
    if (requestType === "heartbeat" && device_id) {
      const { data: device } = await supabase
        .from("devices")
        .select("id, organization_id, is_active")
        .eq("id", device_id)
        .single();

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!device.is_active) {
        return new Response(JSON.stringify({ error: "Device is inactive" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("devices").update({ status: "offline" })
        .eq("organization_id", device.organization_id).eq("status", "online")
        .lt("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

      await supabase.from("devices")
        .update({ last_seen_at: new Date().toISOString(), status: "online" })
        .eq("id", device.id);

      return new Response(
        JSON.stringify({ success: true, status: "online", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle test ping
    if (body.test && device_id) {
      const { data: device } = await supabase.from("devices").select("id, is_active").eq("id", device_id).single();
      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!device.is_active) {
        return new Response(JSON.stringify({ error: "Device is inactive" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("devices")
        .update({ last_seen_at: new Date().toISOString(), status: "online" })
        .eq("id", device.id);
      return new Response(
        JSON.stringify({ success: true, message: "Test ping successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!device_id || !message) {
      return new Response(JSON.stringify({ error: "device_id and message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate message length
    if (typeof message !== "string" || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id, organization_id, is_active, brand_id")
      .eq("id", device_id)
      .single();

    if (!device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!device.is_active) {
      return new Response(JSON.stringify({ error: "Device is inactive" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseSms(message, sender);
    const finalAmount = parsed.amount ?? (rawAmount ? parseFloat(rawAmount) : null);
    const finalTrxId = parsed.trx_id ?? (rawTrxId ? sanitizeString(rawTrxId, 50) : null);
    const finalProvider = parsed.provider ?? (rawProvider ? sanitizeString(rawProvider, 20) : null);
    const finalSenderNumber = parsed.sender_number ?? (phone_number ? sanitizeString(phone_number, 15) : null);

    // Validate amount range
    if (finalAmount !== null && (finalAmount <= 0 || finalAmount > 10000000 || isNaN(finalAmount))) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let smsStatus = "pending";
    if (finalAmount && finalTrxId) smsStatus = "approved";
    else if (!finalAmount && !finalTrxId) smsStatus = "error";

    const { data: smsData, error: smsError } = await supabase
      .from("sms_data")
      .insert({
        organization_id: device.organization_id,
        device_id: device.id,
        brand_id: device.brand_id,
        sender: sanitizeString(sender || "unknown", 50),
        message: sanitizeString(message, 2000),
        amount: finalAmount,
        provider: finalProvider,
        transaction_id: finalTrxId,
        status: smsStatus,
        parsed_at: smsStatus === "approved" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (smsError) {
      console.error("SMS insert error:", smsError);
      return new Response(JSON.stringify({ error: "Failed to store SMS" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("devices")
      .update({ last_seen_at: new Date().toISOString(), status: "online" })
      .eq("id", device.id);

    // Auto-match with pending transactions (scoped to org)
    let matched = false;
    if (finalTrxId && finalAmount && smsStatus === "approved") {
      const { data: pendingTxns } = await supabase
        .from("transactions")
        .select("*")
        .eq("organization_id", device.organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

      if (pendingTxns) {
        const { data: brandSettings } = await supabase
          .from("settings").select("value")
          .eq("organization_id", device.organization_id)
          .eq("name", "payment_tolerance")
          .maybeSingle();

        const tolerancePercent = brandSettings?.value ? parseFloat(brandSettings.value) : 0.5;

        for (const txn of pendingTxns) {
          const meta = txn.metadata as Record<string, any> || {};
          const txnTrxId = meta.trx_id || meta.transaction_id;

          if (txnTrxId && txnTrxId.toLowerCase() === finalTrxId.toLowerCase()) {
            const tolerance = txn.amount * (tolerancePercent / 100);
            const amountDiff = Math.abs(txn.amount - finalAmount);

            if (amountDiff <= tolerance || amountDiff <= 1) {
              await supabase.from("transactions").update({
                status: "completed",
                metadata: {
                  ...meta, auto_matched: true, sms_data_id: smsData.id,
                  matched_at: new Date().toISOString(),
                  matched_sender: finalSenderNumber, matched_trx_id: finalTrxId, matched_amount: finalAmount,
                },
              }).eq("id", txn.id);

              await supabase.from("sms_data").update({ status: "used" }).eq("id", smsData.id);

              // Fire webhook (sanitize URL)
              const webhookUrl = meta.webhook_url;
              if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.startsWith("http")) {
                try {
                  const payload = {
                    event: "payment.completed", ref: txn.reference, amount: txn.amount,
                    currency: txn.currency, status: "completed",
                    sender_number: finalSenderNumber || sender, trx_id: finalTrxId,
                    metadata: meta.metadata || {}, timestamp: new Date().toISOString(),
                  };
                  const resp = await fetch(webhookUrl, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  await supabase.from("webhook_logs").insert({
                    organization_id: device.organization_id, event_type: "payment.completed",
                    url: webhookUrl, payload, response_status: resp.status,
                    response_body: (await resp.text().catch(() => ""))?.substring(0, 2000) || null,
                  });
                } catch (e) {
                  console.error("Webhook failed:", e);
                  await supabase.from("webhook_logs").insert({
                    organization_id: device.organization_id, event_type: "payment.completed",
                    url: webhookUrl,
                    payload: { event: "payment.completed", ref: txn.reference },
                    response_body: `Error: ${(e as Error).message}`.substring(0, 2000),
                    next_retry_at: new Date(Date.now() + 60000).toISOString(),
                  });
                }
              }
              matched = true;
              break;
            }
          }

          // Amount-based matching
          if (!txnTrxId && !matched) {
            const tolerance = txn.amount * (tolerancePercent / 100);
            const amountDiff = Math.abs(txn.amount - finalAmount);
            if (amountDiff <= tolerance || amountDiff <= 1) {
              if (txn.gateway_id) {
                const { data: gw } = await supabase
                  .from("gateways").select("gateway_type, display_name")
                  .eq("id", txn.gateway_id).single();
                if (gw && finalProvider && gw.gateway_type.toLowerCase().includes(finalProvider.toLowerCase())) {
                  await supabase.from("transactions").update({
                    status: "completed",
                    metadata: {
                      ...meta, auto_matched: true, match_type: "amount_gateway",
                      sms_data_id: smsData.id, matched_at: new Date().toISOString(),
                      matched_sender: finalSenderNumber, matched_trx_id: finalTrxId, matched_amount: finalAmount,
                    },
                  }).eq("id", txn.id);
                  await supabase.from("sms_data").update({ status: "used" }).eq("id", smsData.id);

                  const wUrl = meta.webhook_url;
                  if (wUrl && typeof wUrl === "string" && wUrl.startsWith("http")) {
                    try {
                      const payload = {
                        event: "payment.completed", ref: txn.reference, amount: txn.amount,
                        currency: txn.currency, status: "completed",
                        sender_number: finalSenderNumber || sender, trx_id: finalTrxId,
                        timestamp: new Date().toISOString(),
                      };
                      const resp = await fetch(wUrl, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      await supabase.from("webhook_logs").insert({
                        organization_id: device.organization_id, event_type: "payment.completed",
                        url: wUrl, payload, response_status: resp.status,
                        response_body: (await resp.text().catch(() => ""))?.substring(0, 2000) || null,
                      });
                    } catch (e) { console.error("Webhook failed:", e); }
                  }
                  matched = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Store MFS transaction
    if (smsStatus === "approved" && finalAmount && finalTrxId) {
      await supabase.from("mfs_transactions").insert({
        organization_id: device.organization_id,
        device_id: device.id,
        brand_id: device.brand_id,
        payment_method: finalProvider || "unknown",
        transaction_id: finalTrxId,
        amount: finalAmount,
        balance: parsed.balance || 0,
        phone_number: finalSenderNumber || "",
        status: matched ? "matched" : "approved",
      }).then(({ error }) => { if (error) console.error("MFS insert error:", error); });
    }

    return new Response(JSON.stringify({
      success: true, sms_id: smsData.id, matched,
      parsed: { amount: finalAmount, trx_id: finalTrxId, sender_number: finalSenderNumber, provider: finalProvider, balance: parsed.balance },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook-sms error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
