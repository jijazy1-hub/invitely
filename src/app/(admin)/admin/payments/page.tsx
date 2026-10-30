export const dynamic = "force-dynamic";
// src/app/(admin)/admin/payments/page.tsx
import { headers } from "next/headers";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatNaira } from "@/lib/plans";
import { getProviders } from "@/lib/payments";
import { formatShortDate } from "@/lib/utils";

const STATUSES = ["ALL", "SUCCESSFUL", "PENDING", "FAILED"] as const;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? (searchParams.status as string) : "ALL";

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-domain.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;
  const providers = getProviders();

  let body: React.ReactNode;
  try {
    const [totals, payments] = await Promise.all([
      prisma.payment.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
      prisma.payment.findMany({
        where: status === "ALL" ? {} : { status },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const ids = Array.from(new Set(payments.map((p) => p.userId)));
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const t = (s: string) => totals.find((x) => x.status === s);

    body = (
      <>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Collected", s: "SUCCESSFUL", color: "text-emerald-700" },
            { label: "Pending", s: "PENDING", color: "text-amber-700" },
            { label: "Failed", s: "FAILED", color: "text-red-700" },
          ].map(({ label, s, color }) => (
            <div key={s} className="rounded-xl border border-stone-200 bg-white p-5">
              <p className={`text-2xl font-bold ${color}`}>{formatNaira(t(s)?._sum.amount ?? 0)}</p>
              <p className="text-xs font-medium text-stone-700 mt-1">{label}</p>
              <p className="text-xs text-stone-400">{t(s)?._count ?? 0} payments</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === "ALL" ? "/admin/payments" : `/admin/payments?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                status === s ? "bg-[#0A2810] text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-[#0A2810]"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Via</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payments.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-stone-500">No payments yet.</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-stone-900">{emailById.get(p.userId) ?? p.userId}</td>
                  <td className="px-5 py-3">{p.plan}</td>
                  <td className="px-5 py-3 font-semibold">{formatNaira(p.amount)}</td>
                  <td className="px-5 py-3 text-stone-600">{p.provider}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${p.status === "SUCCESSFUL" ? "text-emerald-600" : p.status === "FAILED" ? "text-red-600" : "text-amber-600"}`}>
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-500 whitespace-nowrap">{formatShortDate(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-stone-400">{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } catch (error) {
    console.error("[ADMIN][PAYMENTS] Failed:", error);
    body = (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Couldn't load payments. Check that the admin migration SQL has been run, then reload.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Payments</h1>
        <p className="text-sm text-stone-500 mt-1">Money collected, and the payment platforms connected to Invitely.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-stone-900">Payment platforms</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map((p) => (
            <div key={p.key} className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900">{p.name}</h3>
                {p.configured ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                    <CircleAlert className="h-4 w-4" /> Not connected
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-500">Environment variables (set in Vercel)</p>
                {p.envVars.map((v) => (
                  <p key={v.name} className="font-mono text-xs">
                    <span className={v.set ? "text-emerald-600" : "text-red-500"}>{v.set ? "✓" : "✗"}</span> {v.name}
                  </p>
                ))}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-500">Webhook URL</p>
                <p className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 font-mono text-xs break-all">
                  {origin}{p.webhookPath}
                </p>
                <p className="text-xs text-stone-400">{p.webhookNote}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-stone-900">Transactions</h2>
        {body}
      </section>
    </div>
  );
}
