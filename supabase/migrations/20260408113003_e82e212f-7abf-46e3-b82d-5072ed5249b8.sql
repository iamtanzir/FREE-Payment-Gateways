
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invoices" ON public.invoices FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create invoices" ON public.invoices FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update invoices" ON public.invoices FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete invoices" ON public.invoices FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  domain TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brands" ON public.brands FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create brands" ON public.brands FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update brands" ON public.brands FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete brands" ON public.brands FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view activity logs" ON public.activity_logs FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

-- SMS Data table
CREATE TABLE public.sms_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  amount NUMERIC,
  provider TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  parsed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sms data" ON public.sms_data FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create sms data" ON public.sms_data FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update sms data" ON public.sms_data FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete sms data" ON public.sms_data FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- Devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'android',
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view devices" ON public.devices FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create devices" ON public.devices FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update devices" ON public.devices FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete devices" ON public.devices FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
