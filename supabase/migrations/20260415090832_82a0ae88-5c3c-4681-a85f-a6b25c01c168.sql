CREATE POLICY "Anon can create default link customers"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (created_from = 'default_link');