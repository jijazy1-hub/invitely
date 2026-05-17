// src/app/(dashboard)/events/[eventId]/guests/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Users, Upload, Plus, Search, CheckCircle, Clock,
  XCircle, Download, ArrowLeft, FileText, Loader2, Trash2
} from "lucide-react";
import Link from "next/link";

type Guest = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rsvp: { status: "PENDING" | "CONFIRMED" | "DECLINED"; seatNumber?: number } | null;
};

type ImportReport = {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
};

export default function GuestsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending" | "declined">("all");
  const [importTab, setImportTab] = useState<"text" | "file" | "manual">("text");
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      setGuests(data.guests || []);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

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

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setImporting(true);
    setImportReport(null);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText }),
      });
      const data = await res.json();
      setImportReport(data.report);
      if (data.report.imported > 0) {
        setBulkText("");
        fetchGuests();
      }
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImportReport(data.report);
      if (data.report.imported > 0) fetchGuests();
    } finally {
      setImporting(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualName.trim() || !manualPhone.trim()) return;
    setAddingManual(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manualName, phone: manualPhone, email: manualEmail }),
      });
      if (res.ok) {
        setManualName(""); setManualPhone(""); setManualEmail("");
        fetchGuests();
      }
    } finally {
      setAddingManual(false);
    }
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm("Remove this guest?")) return;
    await fetch(`/api/events/${eventId}/guests/${guestId}`, { method: "DELETE" });
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
          <Upload className="h-4 w-4" />
          Import / Add Guests
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

      {/* Import panel */}
      {showImport && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Add Guests</h2>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1 w-fit">
            {[
              { key: "text", label: "Paste Text" },
              { key: "file", label: "Upload File" },
              { key: "manual", label: "Manual Entry" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setImportTab(key as typeof importTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importTab === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {importTab === "text" && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">
                Paste names and phone numbers, one per line. Format: <code className="bg-stone-100 px-1 rounded">Name, Phone</code>
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder={"John Doe, 08012345678\nMary Jane, 08098765432\nChris Obi, +2348123456789"}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-mono text-stone-900 outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
              />
              <button
                onClick={handleBulkImport}
                disabled={importing || !bulkText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60 transition-colors"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importing..." : "Import Guests"}
              </button>
            </div>
          )}

          {importTab === "file" && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">
                Upload a <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.txt</strong>, or <strong>.docx</strong> file with guest names and phone numbers.
              </p>
              <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 px-6 py-10 cursor-pointer hover:border-[#0A2810]/30 transition-colors">
                <FileText className="h-8 w-8 text-stone-400" />
                <span className="text-sm text-stone-600 font-medium">Click to upload file</span>
                <span className="text-xs text-stone-400">CSV, XLSX, TXT, DOCX supported</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt,.docx"
                  onChange={handleFileImport}
                  className="sr-only"
                  disabled={importing}
                />
              </label>
              {importing && (
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing file...
                </div>
              )}
            </div>
          )}

          {importTab === "manual" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Full name *"
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
                />
                <input
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone number *"
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
                />
                <input
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
                />
              </div>
              <button
                onClick={handleAddManual}
                disabled={addingManual || !manualName || !manualPhone}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60 transition-colors"
              >
                {addingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Guest
              </button>
            </div>
          )}

          {/* Import report */}
          {importReport && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 text-sm space-y-1">
              <p className="font-semibold text-stone-900">Import Report</p>
              <p className="text-emerald-700">✓ {importReport.imported} imported</p>
              {importReport.duplicates > 0 && <p className="text-amber-700">⚠ {importReport.duplicates} duplicates skipped</p>}
              {importReport.invalid > 0 && <p className="text-red-700">✗ {importReport.invalid} invalid entries skipped</p>}
            </div>
          )}
        </div>
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
