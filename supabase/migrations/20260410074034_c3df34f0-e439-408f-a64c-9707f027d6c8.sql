-- Allow anonymous/public users to read transactions by reference (for checkout pages)
CREATE POLICY "Public can view transactions by reference"
ON public.transactions
FOR SELECT
TO anon
USING (reference IS NOT NULL);

-- Allow anonymous/public users to read active gateways (for checkout)
CREATE POLICY "Public can view active gateways"
ON public.gateways
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous/public users to read active FAQs (for checkout)
CREATE POLICY "Public can view active faqs"
ON public.faqs
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous/public users to read default brands (for checkout)
CREATE POLICY "Public can view brands"
ON public.brands
FOR SELECT
TO anon
USING (true);

-- Allow anonymous/public users to update transactions (for submitting TrxID in checkout)
CREATE POLICY "Public can update pending transactions"
ON public.transactions
FOR UPDATE
TO anon
USING (status = 'pending')
WITH CHECK (status = 'pending');