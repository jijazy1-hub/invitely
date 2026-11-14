// Analytics is only for paid plans. Free users see an upgrade prompt instead.
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { canUseAnalytics } from "@/lib/access";
import { AnalyticsUpgradePrompt } from "@/components/billing/upgrade-prompt";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!(await canUseAnalytics(userId))) return <AnalyticsUpgradePrompt />;
  return <>{children}</>;
}
