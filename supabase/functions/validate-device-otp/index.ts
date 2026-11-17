import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action") || "";

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

    const action = queryAction || (body.action as string) || "";

    // Action: generate OTP for a device — only an admin of the device's org
    if (action === "generate") {
      const authHeader = req.headers.get("authorization") || "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!jwt) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const deviceId = body.device_id as string;
      if (!deviceId) {
        return new Response(JSON.stringify({ error: "device_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: device, error: deviceLookupError } = await supabase
        .from("devices")
        .select("id, organization_id")
        .eq("id", deviceId)
        .single();

      if (deviceLookupError || !device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("organization_id", device.organization_id)
        .maybeSingle();

      if (!role || !["super_admin", "merchant_admin"].includes(role.role)) {
        return new Response(JSON.stringify({ error: "Not allowed for this device" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate numeric OTP (10 digits)
      const otp = Array.from(crypto.getRandomValues(new Uint32Array(1)))
        .map(n => (n % 9000000000 + 1000000000).toString())[0];

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("devices")
        .update({ otp, otp_expires_at: expiresAt })
        .eq("id", deviceId);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: true, otp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: validate OTP (called by PipraPay app - no auth needed)
    if (action === "validate" || !action) {
      const otp = (body.otp ?? body.password ?? url.searchParams.get("otp") ?? "") as string;
      if (!otp) {
        return new Response(JSON.stringify({ status: false, message: "OTP required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("id, webhook_key, organization_id, otp_expires_at, name")
        .eq("otp", otp.trim())
        .single();

      if (deviceError || !device) {
        return new Response(JSON.stringify({ status: false, message: "Invalid OTP" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (device.otp_expires_at && new Date(device.otp_expires_at) < new Date()) {
        await supabase.from("devices").update({ otp: null, otp_expires_at: null }).eq("id", device.id);
        return new Response(JSON.stringify({ status: false, message: "OTP expired" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let webhookKey = device.webhook_key;
      if (!webhookKey) {
        webhookKey = "wh_" + Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
        await supabase.from("devices").update({ webhook_key: webhookKey }).eq("id", device.id);
      }

      // Clear OTP after use
      await supabase.from("devices").update({ otp: null, otp_expires_at: null }).eq("id", device.id);

      const webhookUrl = `${supabaseUrl}/functions/v1/piprapay-webhook`;

      return new Response(JSON.stringify({
        status: true,
        message: "Device connected successfully",
        device_name: device.name,
        webhook_url: webhookUrl,
        api_key: webhookKey,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validate-device-otp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
