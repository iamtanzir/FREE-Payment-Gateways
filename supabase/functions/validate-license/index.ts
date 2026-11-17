import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { license_key, domain } = await req.json();

    if (!license_key || !domain) {
      return new Response(
        JSON.stringify({ valid: false, error: "license_key and domain are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: license, error } = await supabase
      .from("licenses")
      .select("id, license_key, status, license_type, product, expires_at, authorized_domains, max_domains, customer_name")
      .eq("license_key", license_key.toUpperCase())
      .single();

    if (error || !license) {
      return new Response(
        JSON.stringify({ valid: false, error: "License not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status
    if (license.status !== "active") {
      return new Response(
        JSON.stringify({ valid: false, error: `License is ${license.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      return new Response(
        JSON.stringify({ valid: false, error: "License has expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check domain
    const domains = license.authorized_domains || [];
    if (!domains.includes(domain)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Domain not authorized for this license" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        license: {
          type: license.license_type,
          product: license.product,
          expires_at: license.expires_at,
          customer_name: license.customer_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
