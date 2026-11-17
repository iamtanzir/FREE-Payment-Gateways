CREATE POLICY "Public can create transactions from payment links"
ON public.transactions
FOR INSERT
TO anon
WITH CHECK (status = 'pending' AND payment_link_id IS NOT NULL);