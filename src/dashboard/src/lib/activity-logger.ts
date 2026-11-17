import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  orgId: string;
  userId: string;
  brandId?: string | null;
  details?: Record<string, any>;
}

export async function logActivity({
  action,
  entityType,
  entityId,
  orgId,
  userId,
  brandId,
  details = {},
}: LogActivityParams) {
  try {
    await supabase.from("activity_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      organization_id: orgId,
      user_id: userId,
      details: { ...details, ...(brandId ? { brand_id: brandId } : {}) },
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
