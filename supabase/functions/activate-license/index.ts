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
    const { license_key, domain, org_id } = await req.json();

    if (!license_key || !domain || !org_id) {
      return new Response(
        JSON.stringify({ error: "license_key, domain, and org_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find license
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", license_key.toUpperCase())
      .single();

    if (error || !license) {
      return new Response(
        JSON.stringify({ error: "Invalid license key" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if revoked
    if (license.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This license has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      return new Response(
        JSON.stringify({ error: "This license has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already activated by another org
    if (license.activated_by_org_id && license.activated_by_org_id !== org_id) {
      return new Response(
        JSON.stringify({ error: "This license is already activated by another organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check domain limit
    const currentDomains = license.authorized_domains || [];
    if (!currentDomains.includes(domain)) {
      if (currentDomains.length >= license.max_domains) {
        return new Response(
          JSON.stringify({ error: `Maximum domain limit (${license.max_domains}) reached` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Activate: add domain and set status
    const updatedDomains = currentDomains.includes(domain)
      ? currentDomains
      : [...currentDomains, domain];

    const { error: updateError } = await supabase
      .from("licenses")
      .update({
        status: "active",
        activated_by_org_id: org_id,
        authorized_domains: updatedDomains,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", license.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "License activated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
