
-- Create enums
CREATE TYPE public.app_role AS ENUM ('super_admin', 'merchant_admin', 'staff', 'viewer');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.gateway_type AS ENUM ('stripe', 'paypal', 'bkash', 'nagad', 'razorpay', 'bank_transfer', 'crypto');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
    AND role IN ('super_admin', 'merchant_admin')
  )
$$;

-- Gateways
CREATE TABLE public.gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gateway_type public.gateway_type NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_gateways_updated_at BEFORE UPDATE ON public.gateways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment Links
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  gateway_id UUID REFERENCES public.gateways(id),
  payment_link_id UUID REFERENCES public.payment_links(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.transaction_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook Logs
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- API Keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Organizations: members can view
CREATE POLICY "Org members can view org" ON public.organizations FOR SELECT USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Super admins can create orgs" ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Org admins can update org" ON public.organizations FOR UPDATE USING (public.is_org_admin(auth.uid(), id));

-- User roles: members can view roles in their org
CREATE POLICY "Members can view org roles" ON public.user_roles FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Gateways
CREATE POLICY "Org members can view gateways" ON public.gateways FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage gateways" ON public.gateways FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update gateways" ON public.gateways FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete gateways" ON public.gateways FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Customers
CREATE POLICY "Org members can view customers" ON public.customers FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage customers" ON public.customers FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update customers" ON public.customers FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));

-- Payment Links
CREATE POLICY "Org members can view payment links" ON public.payment_links FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage payment links" ON public.payment_links FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update payment links" ON public.payment_links FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));

-- Transactions
CREATE POLICY "Org members can view transactions" ON public.transactions FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update transactions" ON public.transactions FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));

-- Webhook Logs
CREATE POLICY "Org members can view webhook logs" ON public.webhook_logs FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- API Keys
CREATE POLICY "Org members can view api keys" ON public.api_keys FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage api keys" ON public.api_keys FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update api keys" ON public.api_keys FOR UPDATE USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete api keys" ON public.api_keys FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ INDEXES ============
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX idx_transactions_org ON public.transactions(organization_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_payment_links_slug ON public.payment_links(slug);
CREATE INDEX idx_webhook_logs_org ON public.webhook_logs(organization_id);
CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);
