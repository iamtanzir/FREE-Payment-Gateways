ALTER TABLE public.balance_verifications ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_balance_verifications_brand_id ON public.balance_verifications(brand_id);

ALTER TABLE public.orderboxes ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_orderboxes_brand_id ON public.orderboxes(brand_id);

ALTER TABLE public.notification_channels ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_notification_channels_brand_id ON public.notification_channels(brand_id);