import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    const body = await req.json().catch(() => ({}));

    // Fix #1 & #8: Support immediate delivery mode
    if (body.url && body.payload) {
      try {
        const response = await fetch(body.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": body.payload?.event || "payment.updated",
            "X-Webhook-Attempt": "1",
          },
          body: JSON.stringify(body.payload),
        });

        const responseBody = await response.text().catch(() => null);
        const isSuccess = response.status >= 200 && response.status < 300;

        return new Response(
          JSON.stringify({
            success: isSuccess,
            status: response.status,
            response_body: responseBody?.substring(0, 2000) || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("Immediate webhook delivery failed:", err);
        return new Response(
          JSON.stringify({ success: false, error: (err as Error).message }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Retry mode: process pending/failed webhooks
    const MAX_ATTEMPTS = 5;

    const { data: pendingWebhooks } = await supabase
      .from("webhook_logs")
      .select("*")
      .or(`response_status.is.null,response_status.gte.400`)
      .lt("attempt", MAX_ATTEMPTS)
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(20);

    if (!pendingWebhooks || pendingWebhooks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, retried: 0, message: "No webhooks to retry" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let retried = 0;
    let succeeded = 0;

    for (const webhook of pendingWebhooks) {
      try {
        const payload = webhook.payload as Record<string, unknown>;

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": webhook.event_type,
            "X-Webhook-Attempt": String(webhook.attempt + 1),
          },
          body: JSON.stringify(payload),
        });

        const responseBody = await response.text().catch(() => null);
        const newAttempt = webhook.attempt + 1;
        const isSuccess = response.status >= 200 && response.status < 300;

        const backoffMinutes = [1, 5, 15, 60, 240];
        const nextRetry = !isSuccess && newAttempt < MAX_ATTEMPTS
          ? new Date(Date.now() + (backoffMinutes[newAttempt - 1] || 240) * 60000).toISOString()
          : null;

        await supabase
          .from("webhook_logs")
          .update({
            attempt: newAttempt,
            response_status: response.status,
            response_body: responseBody?.substring(0, 2000) || null,
            next_retry_at: nextRetry,
          })
          .eq("id", webhook.id);

        retried++;
        if (isSuccess) succeeded++;
      } catch (err) {
        console.error(`Webhook retry failed for ${webhook.id}:`, err);
        const newAttempt = webhook.attempt + 1;
        const backoffMinutes = [1, 5, 15, 60, 240];

        await supabase
          .from("webhook_logs")
          .update({
            attempt: newAttempt,
            response_body: `Error: ${(err as Error).message}`,
            next_retry_at: newAttempt < MAX_ATTEMPTS
              ? new Date(Date.now() + (backoffMinutes[newAttempt - 1] || 240) * 60000).toISOString()
              : null,
          })
          .eq("id", webhook.id);

        retried++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, retried, succeeded, total: pendingWebhooks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("webhook-delivery error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
