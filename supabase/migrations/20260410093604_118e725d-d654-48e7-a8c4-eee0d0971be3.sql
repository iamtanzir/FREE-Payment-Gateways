-- Authenticated users can also view transactions by reference
CREATE POLICY "Authenticated can view transactions by reference"
ON public.transactions
FOR SELECT
TO authenticated
USING (reference IS NOT NULL);

-- Public (anon) can view theme_settings for checkout theming
CREATE POLICY "Public can view theme_settings"
ON public.theme_settings
FOR SELECT
TO anon
USING (true);

-- Authenticated non-members can also view theme_settings for checkout
CREATE POLICY "Authenticated can view theme_settings"
ON public.theme_settings
FOR SELECT
TO authenticated
USING (true);