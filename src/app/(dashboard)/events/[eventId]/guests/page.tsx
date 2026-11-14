// src/app/(dashboard)/events/[eventId]/guests/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Users, Upload, Plus, Search, CheckCircle, Clock,
  XCircle, Download, ArrowLeft, FileText, Loader2, Trash2, UserPlus
} from "lucide-react";
import Link from "next/link";
import { GuestAddPanel } from "@/components/guests/guest-add-panel";

type Guest = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rsvp: { status: "PENDING" | "CONFIRMED" | "DECLINED"; seatNumber?: number } | null;
};


export default function GuestsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending" | "declined">("all");
  const [showImport, setShowImport] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json().catch(() => ({}));
      setLoadError(res.ok ? null : data.error || "Could not load guests.");
      setGuests(data.guests || []);
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  // No guests yet: show the add panel straight away.
  useEffect(() => { if (!loading && !loadError && guests.length === 0) setShowImport(true); }, [loading, loadError, guests.length]);

  const filteredGuests = guests.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search);
    const matchTab =
      activeTab === "all" ||
      (activeTab === "confirmed" && g.rsvp?.status === "CONFIRMED") ||
      (activeTab === "pending" && (!g.rsvp || g.rsvp.status === "PENDING")) ||
      (activeTab === "declined" && g.rsvp?.status === "DECLINED");
    return matchSearch && matchTab;
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvp?.status === "CONFIRMED").length,
    pending: guests.filter((g) => !g.rsvp || g.rsvp?.status === "PENDING").length,
    declined: guests.filter((g) => g.rsvp?.status === "DECLINED").length,
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm("Remove this guest?")) return;
    const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not remove guest.");
    }
    fetchGuests();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/events/${eventId}`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">Guest List</h1>
          <p className="text-sm text-stone-500">{stats.total} guests total</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {showImport ? "Hide" : "Add / Import Guests"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "all", label: "All Guests", count: stats.total, color: "bg-stone-50 border-stone-200" },
          { key: "confirmed", label: "Confirmed", count: stats.confirmed, color: "bg-emerald-50 border-emerald-200" },
          { key: "pending", label: "Pending", count: stats.pending, color: "bg-amber-50 border-amber-200" },
          { key: "declined", label: "Declined", count: stats.declined, color: "bg-red-50 border-red-200" },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`rounded-xl border p-4 text-left transition-all ${color} ${
              activeTab === key ? "ring-2 ring-[#0A2810]" : ""
            }`}
          >
            <p className="text-2xl font-bold text-stone-900">{count}</p>
            <p className="text-xs text-stone-600 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Add / import panel */}
      {showImport && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Add Guests</h2>
            {guests.length > 0 && (
              <button onClick={() => setShowImport(false)} className="text-xs text-stone-500 hover:text-stone-800">Close</button>
            )}
          </div>
          <GuestAddPanel eventId={eventId} onChanged={fetchGuests} />
        </div>
      )}

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests by name or phone..."
          className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
        />
      </div>

      {/* Guest list */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400 mx-auto" />
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No guests found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">RSVP</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Seat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredGuests.map((g) => (
                <tr key={g.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-900">{g.name}</td>
                  <td className="px-4 py-3 font-mono text-stone-600">{g.phone}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={g.rsvp?.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">{g.rsvp?.seatNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "CONFIRMED") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
      <CheckCircle className="h-3 w-3" /> Confirmed
    </span>
  );
  if (status === "DECLINED") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
      <XCircle className="h-3 w-3" /> Declined
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
