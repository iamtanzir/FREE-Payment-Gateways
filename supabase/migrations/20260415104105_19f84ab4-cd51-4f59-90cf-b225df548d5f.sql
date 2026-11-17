
-- Create license type enum
CREATE TYPE public.license_type AS ENUM ('regular', 'premium');

-- Create license status enum
CREATE TYPE public.license_status AS ENUM ('active', 'inactive', 'expired', 'revoked');

-- Create payment status enum for licenses
CREATE TYPE public.license_payment_status AS ENUM ('pending', 'paid', 'manual', 'free');

-- Create licenses table
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product TEXT NOT NULL DEFAULT 'FREE Payment Gateways',
  license_type public.license_type NOT NULL DEFAULT 'regular',
  status public.license_status NOT NULL DEFAULT 'inactive',
  max_domains INTEGER NOT NULL DEFAULT 1,
  authorized_domains TEXT[] NOT NULL DEFAULT '{}',
  api_domains TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activated_by_org_id UUID REFERENCES public.organizations(id),
  payment_status public.license_payment_status NOT NULL DEFAULT 'pending',
  price_amount NUMERIC NOT NULL DEFAULT 0,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create license_settings table (one per org)
CREATE TABLE public.license_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  regular_price NUMERIC NOT NULL DEFAULT 49,
  premium_price NUMERIC NOT NULL DEFAULT 149,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_expiry_days INTEGER NOT NULL DEFAULT 365,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_settings ENABLE ROW LEVEL SECURITY;

-- Licenses RLS policies
CREATE POLICY "Org admins can create licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update licenses"
  ON public.licenses FOR UPDATE
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete licenses"
  ON public.licenses FOR DELETE
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view licenses"
  ON public.licenses FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Public can verify licenses by key"
  ON public.licenses FOR SELECT TO anon
  USING (true);

-- License settings RLS policies
CREATE POLICY "Org admins can create license_settings"
  ON public.license_settings FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update license_settings"
  ON public.license_settings FOR UPDATE
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete license_settings"
  ON public.license_settings FOR DELETE
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view license_settings"
  ON public.license_settings FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Indexes for performance
CREATE INDEX idx_licenses_license_key ON public.licenses (license_key);
CREATE INDEX idx_licenses_organization_id ON public.licenses (organization_id);
CREATE INDEX idx_licenses_status ON public.licenses (status);
CREATE INDEX idx_licenses_customer_email ON public.licenses (customer_email);
CREATE INDEX idx_licenses_expires_at ON public.licenses (expires_at);

-- Updated_at triggers
CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_license_settings_updated_at
  BEFORE UPDATE ON public.license_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
