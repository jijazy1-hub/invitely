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
