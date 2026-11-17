ALTER TABLE public.transactions 
  DROP CONSTRAINT transactions_gateway_id_fkey;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_gateway_id_fkey 
  FOREIGN KEY (gateway_id) REFERENCES public.gateways(id) 
  ON DELETE SET NULL;