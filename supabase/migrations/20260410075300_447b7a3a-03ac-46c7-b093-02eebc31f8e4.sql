CREATE POLICY "Public can view settings"
ON public.settings
FOR SELECT
TO anon
USING (name IN ('support_whatsapp', 'support_telegram', 'support_messenger', 'support_website', 'support_email', 'support_phone'));