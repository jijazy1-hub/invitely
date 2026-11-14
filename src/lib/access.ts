// src/lib/access.ts
// Feature gates by plan. Analytics is for paid plans (Basic, Premium) only.
// Platform admins always have access.
import { getUserPlan } from "@/lib/plans";
import { getAdminContext } from "@/lib/admin";

export async function canUseAnalytics(userId: string): Promise<boolean> {
  try {
    const plan = await getUserPlan(userId);
    if (plan.key !== "FREE") return true;
  } catch (error) {
    console.error("[ACCESS] plan lookup failed:", error);
  }
  const admin = await getAdminContext().catch(() => null);
  return !!admin;
}

/**
 * Premium card designs (designer layouts, photos, ornaments, fonts).
 * Paid plans by default; the admin can make them free for everyone in Admin > Plans.
 */
export async function canUsePremiumDesigns(userId: string): Promise<boolean> {
  const { premiumDesignsAccess } = await import("@/lib/settings");
  if ((await premiumDesignsAccess()) === "FREE") return true;
  try {
    const plan = await getUserPlan(userId);
    if (plan.key !== "FREE") return true;
  } catch (error) {
    console.error("[ACCESS] plan lookup failed:", error);
  }
  const admin = await getAdminContext().catch(() => null);
  return !!admin;
}
