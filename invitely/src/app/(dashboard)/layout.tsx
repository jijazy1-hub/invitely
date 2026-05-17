// src/app/(dashboard)/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F6F3]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-screen p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
