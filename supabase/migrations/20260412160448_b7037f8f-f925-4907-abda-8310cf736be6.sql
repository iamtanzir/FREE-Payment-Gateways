
-- Add PipraPay compatibility columns to devices
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS webhook_key text UNIQUE;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_model text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_brand text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_version text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_api_level text;

-- Generate webhook_key for existing devices that don't have one
UPDATE public.devices 
SET webhook_key = 'wh_' || encode(gen_random_uuid()::text::bytea, 'hex')
WHERE webhook_key IS NULL;

-- Create trigger to auto-generate webhook_key for new devices
CREATE OR REPLACE FUNCTION public.generate_device_webhook_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.webhook_key IS NULL THEN
    NEW.webhook_key := 'wh_' || encode(gen_random_uuid()::text::bytea, 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_device_webhook_key
BEFORE INSERT ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.generate_device_webhook_key();
