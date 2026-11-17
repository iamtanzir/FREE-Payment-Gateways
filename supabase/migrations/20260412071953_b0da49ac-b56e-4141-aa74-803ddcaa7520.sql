-- Add brand_id to faqs for brand-level isolation
ALTER TABLE public.faqs ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX idx_faqs_brand_id ON public.faqs(brand_id);
