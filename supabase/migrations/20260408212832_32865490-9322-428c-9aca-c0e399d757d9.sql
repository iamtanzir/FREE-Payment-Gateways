
-- Add gateway_parameters to gateways table
ALTER TABLE public.gateways ADD COLUMN IF NOT EXISTS gateway_parameters jsonb DEFAULT '{}'::jsonb;

-- Add missing fields to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_amount numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS private_notes text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS redirect_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS track_id text;

-- Add missing fields to payment_links
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS product_description text;
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 0;
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS form_data jsonb;
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS redirect_url text;

-- Add missing fields to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_from text DEFAULT 'manual';

-- Create brand_settings table
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  value text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view brand_settings" ON public.brand_settings FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create brand_settings" ON public.brand_settings FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update brand_settings" ON public.brand_settings FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete brand_settings" ON public.brand_settings FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- Create theme_settings table
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  value text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, theme, name)
);
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view theme_settings" ON public.theme_settings FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create theme_settings" ON public.theme_settings FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update theme_settings" ON public.theme_settings FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete theme_settings" ON public.theme_settings FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
