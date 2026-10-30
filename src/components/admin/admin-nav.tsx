// src/components/admin/admin-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/plans", label: "Plans", icon: SlidersHorizontal },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-[#0A2810] text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to app
      </Link>
    </nav>
  );
}
