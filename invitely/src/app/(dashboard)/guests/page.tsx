"use client";

// src/app/(dashboard)/guests/page.tsx
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

interface GuestRow {
  id: string;
  name: string;
  phone: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  rsvpStatus: "CONFIRMED" | "DECLINED" | null;
  checkedIn: boolean;
  createdAt: string;
}

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "text-emerald-600 bg-emerald-50",
  },
  DECLINED: {
    label: "Declined",
    icon: XCircle,
    className: "text-red-500 bg-red-50",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "text-amber-500 bg-amber-50",
  },
};

function StatusBadge({ status }: { status: "CONFIRMED" | "DECLINED" | null }) {
  const key = status ?? "PENDING";
  const { label, icon: Icon, className } = STATUS_CONFIG[key];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/guests")
      .then((r) => r.json())
      .then((d) => {
        setGuests(d.guests ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      const matchSearch =
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.phone.includes(search) ||
        g.eventName.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && !g.rsvpStatus) ||
        g.rsvpStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [guests, search, statusFilter]);

  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
    const declined = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
    const pending = guests.filter((g) => !g.rsvpStatus).length;
    const checkedIn = guests.filter((g) => g.checkedIn).length;
    return { confirmed, declined, pending, checkedIn, total: guests.length };
  }, [guests]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#0A2810]/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-[#0A2810]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">All Guests</h1>
          <p className="text-stone-500 text-sm">Across all your events</p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total, color: "text-stone-700" },
            { label: "Confirmed", value: stats.confirmed, color: "text-emerald-600" },
            { label: "Declined", value: stats.declined, color: "text-red-500" },
            { label: "Checked In", value: stats.checkedIn, color: "text-[#0A2810]" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl bg-white border border-stone-200 px-4 py-3"
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-stone-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2810]/20 focus:border-[#0A2810]"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "CONFIRMED", "DECLINED", "PENDING"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-[#0A2810] text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-[#0A2810] border-t-transparent animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 font-medium">No guests found</p>
            <p className="text-stone-400 text-sm mt-1">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your filters."
                : "Add guests via your event pages."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Guest
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Event
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Checked In
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-900">{g.name}</td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-xs">{g.phone}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/events/${g.eventId}`}
                        className="inline-flex items-center gap-1.5 text-[#0A2810] hover:underline font-medium"
                      >
                        {g.eventName}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={g.rsvpStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      {g.checkedIn ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-stone-100 text-xs text-stone-400">
              Showing {filtered.length} of {guests.length} guests
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
