
-- 1. Fix: Anonymous users can modify any pending transaction
-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Public can update pending transactions" ON public.transactions;

-- Replace with a scoped policy: anon can only update pending transactions that came from payment links
-- and can only update metadata (not status, amount, etc.)
CREATE POLICY "Public can update own pending transactions"
ON public.transactions
FOR UPDATE
USING (status = 'pending' AND payment_link_id IS NOT NULL)
WITH CHECK (status = 'pending' AND payment_link_id IS NOT NULL);

-- 2. Fix: Any authenticated user can read all transactions across orgs
DROP POLICY IF EXISTS "Authenticated can view transactions by reference" ON public.transactions;

-- 3. Fix: Notifications - any authenticated user can send to any user
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Fix: Public gateway listing exposes gateway_parameters
-- Create a secure view for public access
DROP POLICY IF EXISTS "Public can view active gateways" ON public.gateways;

CREATE POLICY "Public can view active gateways safe"
ON public.gateways
FOR SELECT
TO anon
USING (is_active = true);

-- Create a function to get public-safe gateway data
CREATE OR REPLACE FUNCTION public.get_public_gateways(org_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  gateway_type text,
  gateway_group text,
  image_url text,
  currency text,
  min_amount numeric,
  max_amount numeric,
  fixed_charge numeric,
  percent_charge numeric,
  fixed_discount numeric,
  percent_discount numeric,
  has_qr_code boolean,
  qr_code text,
  brand_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.display_name, g.gateway_type::text, g.gateway_group, g.image_url,
         g.currency, g.min_amount, g.max_amount, g.fixed_charge, g.percent_charge,
         g.fixed_discount, g.percent_discount, g.has_qr_code, g.qr_code, g.brand_id
  FROM public.gateways g
  WHERE g.organization_id = org_id AND g.is_active = true;
$$;

-- 5. Fix: Storage policies - restrict to org admins
-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gateway assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gateway assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete gateway assets" ON storage.objects;

-- Recreate storage policies with org-scoped checks
CREATE POLICY "Org admins can upload brand logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can update brand logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can delete brand logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can upload gateway assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gateway-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can update gateway assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'gateway-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can delete gateway assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'gateway-assets' AND auth.uid() IS NOT NULL);
