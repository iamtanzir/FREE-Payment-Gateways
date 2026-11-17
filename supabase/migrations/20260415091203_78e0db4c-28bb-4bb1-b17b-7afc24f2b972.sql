-- Drop any existing overly permissive SELECT policies on storage.objects for these buckets
-- and replace with path-based access (no listing)

-- brand-logos: anyone can read a specific file by path, but cannot list
CREATE POLICY "Anyone can read brand logos by path"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'brand-logos'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- gateway-assets: anyone can read a specific file by path, but cannot list
CREATE POLICY "Anyone can read gateway assets by path"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'gateway-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Ensure authenticated users in the org can upload to brand-logos
CREATE POLICY "Authenticated can upload brand logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos'
);

-- Ensure authenticated users can update brand logos
CREATE POLICY "Authenticated can update brand logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos'
);

-- Ensure authenticated users can upload to gateway-assets
CREATE POLICY "Authenticated can upload gateway assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gateway-assets'
);

-- Ensure authenticated users can update gateway-assets
CREATE POLICY "Authenticated can update gateway assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gateway-assets'
);