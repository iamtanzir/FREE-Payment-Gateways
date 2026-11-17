CREATE POLICY "Public can create default link transactions"
ON public.transactions
FOR INSERT
TO anon
WITH CHECK (
  status = 'pending'::transaction_status
  AND payment_link_id IS NULL
  AND metadata->>'source' = 'default_link'
);