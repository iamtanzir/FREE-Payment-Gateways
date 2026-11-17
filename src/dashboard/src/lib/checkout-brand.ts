import { supabase } from "@/integrations/supabase/client";

export interface CheckoutBrand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface ResolveCheckoutBrandParams {
  organizationId: string;
  paymentLinkId?: string | null;
  gatewayId?: string | null;
  preferredBrandId?: string | null;
}

async function fetchBrandById(organizationId: string, brandId: string) {
  const { data } = await supabase
    .from("brands")
    .select("id, name, logo_url, primary_color")
    .eq("organization_id", organizationId)
    .eq("id", brandId)
    .maybeSingle();

  return (data as CheckoutBrand | null) ?? null;
}

async function fetchDefaultBrand(organizationId: string) {
  const { data } = await supabase
    .from("brands")
    .select("id, name, logo_url, primary_color")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as CheckoutBrand | null) ?? null;
}

export async function resolveCheckoutBrand({
  organizationId,
  paymentLinkId,
  gatewayId,
  preferredBrandId,
}: ResolveCheckoutBrandParams): Promise<{ brand: CheckoutBrand | null; brandId: string | null }> {
  let brandId = preferredBrandId ?? null;

  if (!brandId && paymentLinkId) {
    const { data } = await supabase
      .from("payment_links")
      .select("brand_id")
      .eq("id", paymentLinkId)
      .maybeSingle();

    brandId = data?.brand_id ?? null;
  }

  if (!brandId && gatewayId) {
    const { data } = await supabase
      .from("gateways")
      .select("brand_id")
      .eq("id", gatewayId)
      .maybeSingle();

    brandId = data?.brand_id ?? null;
  }

  const brand = brandId
    ? (await fetchBrandById(organizationId, brandId)) ?? (await fetchDefaultBrand(organizationId))
    : await fetchDefaultBrand(organizationId);

  return {
    brand,
    brandId: brand?.id ?? brandId,
  };
}
