CREATE POLICY "Public can view active payment links"
ON public.payment_links
FOR SELECT
TO anon
USING (is_active = true);