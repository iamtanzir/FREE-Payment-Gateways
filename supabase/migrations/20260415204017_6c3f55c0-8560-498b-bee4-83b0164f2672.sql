
-- Function to get all users with profiles and roles (super_admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  org_id uuid,
  org_name text,
  role text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.full_name,
    p.phone,
    p.avatar_url,
    u.created_at,
    u.last_sign_in_at,
    ur.organization_id AS org_id,
    o.name AS org_name,
    ur.role::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.organizations o ON o.id = ur.organization_id
  WHERE public.has_role(auth.uid(), 'super_admin')
  ORDER BY u.created_at DESC;
$$;

-- Function to get all orgs with member counts (super_admin only)
CREATE OR REPLACE FUNCTION public.get_all_orgs_admin()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  website text,
  created_at timestamptz,
  member_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.website,
    o.created_at,
    COUNT(ur.id) AS member_count
  FROM public.organizations o
  LEFT JOIN public.user_roles ur ON ur.organization_id = o.id
  WHERE public.has_role(auth.uid(), 'super_admin')
  GROUP BY o.id, o.name, o.slug, o.logo_url, o.website, o.created_at
  ORDER BY o.created_at DESC;
$$;
