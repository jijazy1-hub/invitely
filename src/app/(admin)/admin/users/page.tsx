export const dynamic = "force-dynamic";
// src/app/(admin)/admin/users/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { effectivePlan, getPlans, PLAN_KEYS } from "@/lib/plans";
import { formatShortDate } from "@/lib/utils";
import { UserPlanForm } from "@/components/admin/user-plan-form";
import { SyncUsersButton } from "@/components/admin/sync-users-button";

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  try {
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [plans, total, users] = await Promise.all([
      getPlans(),
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { subscription: true, _count: { select: { events: true } } },
      }),
    ]);

    const now = new Date();
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const planOptions = PLAN_KEYS.map((k) => ({ key: k, name: plans[k].name }));
    const link = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Users</h1>
            <p className="text-sm text-stone-500 mt-1">{total} {total === 1 ? "user" : "users"}{q ? ` matching “${q}”` : ""}</p>
          </div>
          <SyncUsersButton />
        </div>

        <form className="flex gap-2" action="/admin/users">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or email"
            className="w-full max-w-sm rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#0A2810] focus:outline-none"
          />
          <button className="rounded-lg bg-[#0A2810] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f3515]">Search</button>
          {q && (
            <Link href="/admin/users" className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:text-stone-800">Clear</Link>
          )}
        </form>

        <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Events</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-stone-500">
                    No users found. Try “Sync from Clerk” to import people who already signed up.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const eff = effectivePlan(u.subscription, now);
                const sub = u.subscription;
                const placeholder = u.email.endsWith("@placeholder.invitely.app");
                return (
                  <tr key={u.id} className="align-middle">
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-900">{u.name || (placeholder ? "Unknown name" : u.email)}</p>
                      <p className="text-xs text-stone-500">
                        {placeholder ? <span className="text-amber-700">email not synced yet — use “Sync from Clerk”</span> : u.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-stone-800">{plans[eff].name}</span>
                      {eff !== "FREE" && sub?.gifted && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Gift</span>
                      )}
                      {eff !== "FREE" && (
                        <p className="text-xs text-stone-400">
                          {sub?.currentPeriodEnd ? `until ${formatShortDate(sub.currentPeriodEnd)}` : "no expiry"}
                        </p>
                      )}
                      {eff === "FREE" && sub && sub.plan !== "FREE" && (
                        <p className="text-xs text-stone-400">{plans[sub.plan as keyof typeof plans]?.name ?? sub.plan} expired</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{u._count.events}</td>
                    <td className="px-5 py-3 text-stone-500 whitespace-nowrap">{formatShortDate(u.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <UserPlanForm userId={u.id} email={u.email} currentPlan={eff} plans={planOptions} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-stone-500">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={link(page - 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 hover:border-[#0A2810]">Previous</Link>}
              {page < pages && <Link href={link(page + 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 hover:border-[#0A2810]">Next</Link>}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("[ADMIN][USERS] Failed:", error);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Couldn't load users. Check that the admin migration SQL has been run, then reload.
      </div>
    );
  }
}
