-- Attach the generate_device_webhook_key trigger to devices table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_device_webhook_key'
  ) THEN
    CREATE TRIGGER trigger_generate_device_webhook_key
      BEFORE INSERT ON public.devices
      FOR EACH ROW
      EXECUTE FUNCTION public.generate_device_webhook_key();
  END IF;
END
$$;