INSERT INTO storage.buckets (id, name, public) VALUES ('gateway-assets', 'gateway-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view gateway assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gateway-assets');

CREATE POLICY "Authenticated users can upload gateway assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gateway-assets');

CREATE POLICY "Authenticated users can update gateway assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gateway-assets');

CREATE POLICY "Authenticated users can delete gateway assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gateway-assets');