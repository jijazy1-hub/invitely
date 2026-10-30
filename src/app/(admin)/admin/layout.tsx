// src/app/(admin)/admin/layout.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ShieldCheck } from "lucide-react";
import { getAdminContext } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await getAdminContext();
  if (!admin) notFound(); // don't reveal that an admin area exists

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0A2810] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#D4A843]" />
            </div>
            <span className="font-bold text-[#0A2810] text-lg tracking-tight">Invitely Admin</span>
            {admin.email && <span className="ml-2 text-xs text-stone-400">{admin.email}</span>}
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
