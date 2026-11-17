-- Create refund_status enum
CREATE TYPE public.refund_status AS ENUM ('pending', 'approved', 'rejected');

-- Create refunds table
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status refund_status NOT NULL DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view refunds" ON public.refunds FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create refunds" ON public.refunds FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update refunds" ON public.refunds FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete refunds" ON public.refunds FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create currencies table
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '$',
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view currencies" ON public.currencies FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create currencies" ON public.currencies FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update currencies" ON public.currencies FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete currencies" ON public.currencies FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification_channels table
CREATE TYPE public.notification_channel_type AS ENUM ('email', 'telegram', 'discord', 'slack', 'webhook');

CREATE TABLE public.notification_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_type notification_channel_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notification channels" ON public.notification_channels FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create notification channels" ON public.notification_channels FOR INSERT WITH CHECK (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update notification channels" ON public.notification_channels FOR UPDATE USING (is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete notification channels" ON public.notification_channels FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON public.notification_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();