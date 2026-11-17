-- Add brand_id to devices
ALTER TABLE public.devices ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_devices_brand_id ON public.devices(brand_id);

-- Add brand_id to sms_data
ALTER TABLE public.sms_data ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_sms_data_brand_id ON public.sms_data(brand_id);

-- Add brand_id to mfs_transactions
ALTER TABLE public.mfs_transactions ADD COLUMN brand_id uuid REFERENCES public.brands(id);
CREATE INDEX idx_mfs_transactions_brand_id ON public.mfs_transactions(brand_id);