
-- Add brand_id column to payment_links
ALTER TABLE public.payment_links
ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index for brand filtering
CREATE INDEX idx_payment_links_brand_id ON public.payment_links(brand_id);
