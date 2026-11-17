import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrg();
  const [mfaChecked, setMfaChecked] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    const checkMfa = async () => {
      if (!session) {
        setMfaChecked(true);
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter(f => f.status === "verified") || [];

      if (verifiedFactors.length > 0) {
        // User has MFA enrolled — check AAL level
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          setNeedsMfa(true);
        }
      }

      setMfaChecked(true);
    };

    if (!authLoading) {
      checkMfa();
    }
  }, [session, authLoading]);

  if (authLoading || orgLoading || !mfaChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/landing" replace />;
  }

  if (needsMfa) {
    return <Navigate to="/mfa-verify" replace />;
  }

  if (!currentOrg) {
    return <Navigate to="/org-setup" replace />;
  }

  return <>{children}</>;
}
