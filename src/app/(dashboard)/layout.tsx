import { Sidebar } from "@/components/dashboard/sidebar";
import { getAdminContext } from "@/lib/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let showAdmin = false;
  try {
    showAdmin = !!(await getAdminContext());
  } catch {
    showAdmin = false;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F6F3]">
      <Sidebar showAdmin={showAdmin} />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-screen p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
