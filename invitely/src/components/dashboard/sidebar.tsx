// src/components/dashboard/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard, CalendarDays, Users, Palette,
  BarChart2, CreditCard, Settings, Menu, X, Zap
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",   label: "Overview",   icon: LayoutDashboard },
  { href: "/events",      label: "Events",     icon: CalendarDays },
  { href: "/guests",      label: "Guests",     icon: Users },
  { href: "/templates",   label: "Templates",  icon: Palette },
  { href: "/analytics",   label: "Analytics",  icon: BarChart2 },
  { href: "/billing",     label: "Billing",    icon: CreditCard },
  { href: "/settings",    label: "Settings",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <nav className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-stone-200">
        <div className="h-8 w-8 rounded-lg bg-[#0A2810] flex items-center justify-center">
          <Zap className="h-4 w-4 text-[#D4A843]" />
        </div>
        <span className="font-bold text-[#0A2810] text-lg tracking-tight">Invitely</span>
      </div>

      {/* Nav links */}
      <div className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-[#0A2810] text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* User button */}
      <div className="border-t border-stone-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-sm text-stone-500">Account</span>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-stone-200 bg-white shrink-0">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-white border border-stone-200 p-2 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 border-r border-stone-200 bg-white shadow-xl">
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
