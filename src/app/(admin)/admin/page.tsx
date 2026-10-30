export const dynamic = "force-dynamic";
// src/app/(admin)/admin/page.tsx
import Link from "next/link";
import { Wallet, TrendingUp, Crown, Gift, UserRound, Users, CalendarDays } from "lucide-react";
import prisma from "@/lib/prisma";
import { effectivePlan, formatNaira, getPlans } from "@/lib/plans";
import { formatShortDate } from "@/lib/utils";

const DAY = 86_400_000;

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminOverviewPage() {
  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      plans,
      totalUsers,
      newUsers7,
      newUsers30,
      totalEvents,
      revenueAll,
      revenueMonth,
      paidRows,
      subs,
      recentSignups,
      recentPayments,
    ] = await Promise.all([
      getPlans(),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } }),
      prisma.event.count(),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.payment.findMany({
        where: { status: "SUCCESSFUL", paidAt: { gte: sixMonthsAgo } },
        select: { amount: true, paidAt: true },
      }),
      prisma.subscription.findMany({
        where: { plan: { not: "FREE" } },
        select: { plan: true, status: true, currentPeriodEnd: true, gifted: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { subscription: true },
      }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

    // Subscribers
    let paidSubs = 0;
    let giftedSubs = 0;
    let mrr = 0;
    const byPlan: Record<string, number> = { BASIC: 0, PREMIUM: 0 };
    for (const s of subs) {
      const eff = effectivePlan(s, now);
      if (eff === "FREE") continue;
      byPlan[eff] = (byPlan[eff] ?? 0) + 1;
      if (s.gifted) giftedSubs++;
      else {
        paidSubs++;
        mrr += plans[eff].priceNgn;
      }
    }
    const freeUsers = Math.max(0, totalUsers - paidSubs - giftedSubs);

    // Revenue by month (last 6)
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      buckets.push({
        key: monthKey(d),
        label: new Intl.DateTimeFormat("en-NG", { month: "short", timeZone: "UTC" }).format(d),
        total: 0,
      });
    }
    for (const p of paidRows) {
      if (!p.paidAt) continue;
      const b = buckets.find((x) => x.key === monthKey(p.paidAt as Date));
      if (b) b.total += p.amount;
    }
    const maxBucket = Math.max(1, ...buckets.map((b) => b.total));

    // Emails for recent payments
    const payUserIds = Array.from(new Set(recentPayments.map((p) => p.userId)));
    const payUsers = await prisma.user.findMany({
      where: { id: { in: payUserIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(payUsers.map((u) => [u.id, u.email]));

    const stats = [
      { label: "Total revenue", value: formatNaira(revenueAll._sum.amount ?? 0), sub: `${revenueAll._count} payments`, icon: Wallet },
      { label: "Revenue this month", value: formatNaira(revenueMonth._sum.amount ?? 0), sub: "paid plans only", icon: TrendingUp },
      { label: "Est. monthly recurring", value: formatNaira(mrr), sub: "from active paying subscribers", icon: TrendingUp },
      { label: "Paying subscribers", value: String(paidSubs), sub: `Basic ${byPlan.BASIC ?? 0} · Premium ${byPlan.PREMIUM ?? 0} (incl. gifts)`, icon: Crown },
      { label: "Gifted plans", value: String(giftedSubs), sub: "active, not paid", icon: Gift },
      { label: "Free plan users", value: String(freeUsers), sub: `${totalUsers} users in total`, icon: UserRound },
      { label: "New users", value: String(newUsers7), sub: `last 7 days · ${newUsers30} in 30 days`, icon: Users },
      { label: "Events created", value: String(totalEvents), sub: "all users", icon: CalendarDays },
    ];

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
          <p className="text-sm text-stone-500 mt-1">Revenue, subscribers and signups at a glance.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
              <Icon className="h-5 w-5 text-[#0A2810] opacity-70 mb-3" />
              <p className="text-2xl font-bold text-stone-900 break-words">{value}</p>
              <p className="text-xs font-medium text-stone-700 mt-1">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold text-stone-900 mb-5">Revenue, last 6 months</h2>
          <div className="flex items-end gap-3 h-40">
            {buckets.map((b) => (
              <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                <span className="text-[11px] text-stone-500">{b.total > 0 ? formatNaira(b.total) : ""}</span>
                <div
                  className="w-full rounded-t-md bg-[#0A2810]"
                  style={{ height: `${Math.max(b.total > 0 ? 4 : 1, (b.total / maxBucket) * 100)}%`, opacity: b.total > 0 ? 1 : 0.15 }}
                />
                <span className="text-xs text-stone-500">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">New users</h2>
              <Link href="/admin/users" className="text-sm text-[#0A2810] hover:underline">View all</Link>
            </div>
            {recentSignups.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-500">
                No users yet. If people have signed up already, open Users and click “Sync from Clerk”.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {recentSignups.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{u.name || u.email}</p>
                      {u.name && <p className="text-xs text-stone-500 truncate">{u.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-stone-700">{plans[effectivePlan(u.subscription, now)].name}</p>
                      <p className="text-xs text-stone-400">{formatShortDate(u.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Recent payments</h2>
              <Link href="/admin/payments" className="text-sm text-[#0A2810] hover:underline">View all</Link>
            </div>
            {recentPayments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-500">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{emailById.get(p.userId) ?? p.userId}</p>
                      <p className="text-xs text-stone-500">{p.plan} · {p.provider}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-stone-800">{formatNaira(p.amount)}</p>
                      <p className={`text-xs font-medium ${p.status === "SUCCESSFUL" ? "text-emerald-600" : p.status === "FAILED" ? "text-red-600" : "text-amber-600"}`}>
                        {p.status.toLowerCase()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[ADMIN][OVERVIEW] Failed:", error);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold mb-1">Couldn't load the admin overview.</p>
        <p>
          If you haven't yet, run the admin migration SQL (it creates the payments and plan tables) in the Supabase SQL
          Editor, then reload this page.
        </p>
      </div>
    );
  }
}
