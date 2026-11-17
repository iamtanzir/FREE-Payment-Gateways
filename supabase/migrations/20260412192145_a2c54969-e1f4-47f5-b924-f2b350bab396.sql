-- Update the webhook key generation function to produce shorter keys
CREATE OR REPLACE FUNCTION public.generate_device_webhook_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.webhook_key IS NULL THEN
    NEW.webhook_key := 'wh_' || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

-- Shorten existing long webhook keys (only those with hex-encoded format)
UPDATE devices 
SET webhook_key = 'wh_' || replace(gen_random_uuid()::text, '-', '')
WHERE webhook_key IS NOT NULL AND length(webhook_key) > 40;