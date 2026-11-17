
-- 1. Balance Verifications
CREATE TABLE public.balance_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'bkash',
  type text NOT NULL DEFAULT 'personal',
  balance numeric NOT NULL DEFAULT 0,
  balance_verification_enabled boolean NOT NULL DEFAULT true,
  smart_verification_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.balance_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view balance_verifications" ON public.balance_verifications FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create balance_verifications" ON public.balance_verifications FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update balance_verifications" ON public.balance_verifications FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete balance_verifications" ON public.balance_verifications FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 2. Invoice Items
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  vat numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view invoice_items" ON public.invoice_items FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update invoice_items" ON public.invoice_items FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete invoice_items" ON public.invoice_items FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 3. MFS Transactions
CREATE TABLE public.mfs_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'bkash',
  type text NOT NULL DEFAULT 'personal',
  phone_number text NOT NULL DEFAULT '',
  transaction_id text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  ref text,
  note text,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mfs_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view mfs_transactions" ON public.mfs_transactions FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create mfs_transactions" ON public.mfs_transactions FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update mfs_transactions" ON public.mfs_transactions FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete mfs_transactions" ON public.mfs_transactions FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 4. FAQs
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  order_column integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view faqs" ON public.faqs FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create faqs" ON public.faqs FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update faqs" ON public.faqs FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete faqs" ON public.faqs FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 5. Orderboxes
CREATE TABLE public.orderboxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  label text NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orderboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view orderboxes" ON public.orderboxes FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create orderboxes" ON public.orderboxes FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update orderboxes" ON public.orderboxes FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete orderboxes" ON public.orderboxes FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 6. Domains
CREATE TABLE public.domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view domains" ON public.domains FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create domains" ON public.domains FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update domains" ON public.domains FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete domains" ON public.domains FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 7. Settings (key-value)
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view settings" ON public.settings FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create settings" ON public.settings FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update settings" ON public.settings FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete settings" ON public.settings FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- 8. Update gateways with advanced fields
ALTER TABLE public.gateways
  ADD COLUMN IF NOT EXISTS min_amount numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percent_charge numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percent_discount numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_qr_code boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS gateway_group text NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS gateway_mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BDT',
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add realtime for mfs_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.mfs_transactions;
