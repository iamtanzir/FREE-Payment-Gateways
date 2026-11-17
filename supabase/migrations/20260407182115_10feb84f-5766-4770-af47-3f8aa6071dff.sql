
-- Fix overly permissive org insert policy
DROP POLICY "Super admins can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-assign creator as super_admin
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (auth.uid(), NEW.id, 'super_admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();
