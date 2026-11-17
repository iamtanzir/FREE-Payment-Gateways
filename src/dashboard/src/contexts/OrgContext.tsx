import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import type { Tables } from "@/integrations/supabase/types";

type Organization = Tables<"organizations">;

interface OrgContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refetchOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  organizations: [],
  loading: true,
  switchOrg: () => {},
  refetchOrgs: async () => {},
});

export const useOrg = () => useContext(OrgContext);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const fetchOrgs = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setOrgLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id);

    if (!roles || roles.length === 0) {
      setOrganizations([]);
      setCurrentOrg(null);
      setOrgLoading(false);
      return;
    }

    const orgIds = roles.map((r) => r.organization_id);
    const { data: orgs } = await supabase
      .from("organizations")
      .select("*")
      .in("id", orgIds);

    const orgList = orgs || [];
    setOrganizations(orgList);

    const savedOrgId = localStorage.getItem("fpg_current_org");
    const saved = orgList.find((o) => o.id === savedOrgId);
    setCurrentOrg(saved || orgList[0] || null);
    setOrgLoading(false);
  };

  useEffect(() => {
    if (authLoading) {
      setOrgLoading(true);
      return;
    }
    fetchOrgs();
  }, [user, authLoading]);

  const switchOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem("fpg_current_org", orgId);
    }
  };

  const loading = authLoading || orgLoading;

  return (
    <OrgContext.Provider value={{ currentOrg, organizations, loading, switchOrg, refetchOrgs: fetchOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}
