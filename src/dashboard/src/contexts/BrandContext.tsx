import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

interface BrandContextType {
  activeBrandId: string | null;
  activeBrand: Brand | null;
  brands: Brand[];
  switchBrand: (id: string) => void;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [activeBrandId, setActiveBrandId] = useState<string | null>(() =>
    localStorage.getItem("active_brand_id")
  );

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const activeBrand = useMemo(() => {
    if (!brands.length) return null;
    return brands.find((b) => b.id === activeBrandId) ||
      brands.find((b) => b.is_default) ||
      brands[0];
  }, [brands, activeBrandId]);

  // Derived ID always in sync with activeBrand
  const currentBrandId = activeBrand?.id ?? null;

  // Persist to localStorage when the effective brand changes
  useEffect(() => {
    if (currentBrandId && currentBrandId !== activeBrandId) {
      setActiveBrandId(currentBrandId);
      localStorage.setItem("active_brand_id", currentBrandId);
    }
  }, [currentBrandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchBrand = (id: string) => {
    setActiveBrandId(id);
    localStorage.setItem("active_brand_id", id);
    // Invalidate all brand-specific queries
    const brandKeys = [
      "brand-settings", "theme-settings", "gateways", "transactions-list",
      "transactions", "pending-sms", "dashboard-devices", "payment-links",
      "activity-logs", "customers", "invoices", "report-transactions",
      "api-keys", "refunds", "webhook-logs", "faqs",
      "devices", "sms-data", "mfs_transactions",
      "balance-verifications", "orderboxes", "notification-channels", "domains",
    ];
    brandKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  return (
    <BrandContext.Provider value={{ activeBrandId: currentBrandId, activeBrand, brands, switchBrand, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
