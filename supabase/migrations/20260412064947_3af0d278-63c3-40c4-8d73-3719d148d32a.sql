
-- Add brand_id to customers
ALTER TABLE public.customers ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX idx_customers_brand_id ON public.customers(brand_id);

-- Add brand_id to invoices
ALTER TABLE public.invoices ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX idx_invoices_brand_id ON public.invoices(brand_id);

-- Add brand_id to api_keys
ALTER TABLE public.api_keys ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX idx_api_keys_brand_id ON public.api_keys(brand_id);
