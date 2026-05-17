// src/app/checkin/[slug]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { QrCode, CheckCircle, XCircle, AlertCircle, Loader2, RotateCcw } from "lucide-react";

type CheckinResult = {
  status: "success" | "already_checked_in" | "invalid" | "declined";
  message: string;
  guest?: { name: string; seatNumber?: number };
};

export default function CheckinPage() {
  const { slug } = useParams<{ slug: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [stats, setStats] = useState({ checkedIn: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
    // Auto-focus input for QR scanner
    inputRef.current?.focus();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/checkin?slug=${slug}`);
      const data = await res.json();
      setStats({ checkedIn: data.checkedIn ?? 0, total: data.total ?? 0 });
    } catch {}
  };

  const handleCheckin = async (scanCode?: string) => {
    const useCode = scanCode ?? code.trim().toUpperCase();
    if (!useCode) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code: useCode }),
      });
      const data = await res.json();
      setResult(data);
      setCode("");
      fetchStats();
    } catch {
      setResult({ status: "invalid", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
      // Re-focus for next scan
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheckin();
  };

  return (
    <div className="min-h-screen bg-[#0A2810] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <QrCode className="h-6 w-6 text-[#D4A843]" />
          <div>
            <p className="font-bold text-lg">Check-In Scanner</p>
            <p className="text-xs text-white/60">{slug}</p>
          </div>
        </div>
        <button onClick={fetchStats} className="text-white/60 hover:text-white transition-colors">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 p-6">
        <div className="rounded-2xl bg-white/10 p-5 text-center">
          <p className="text-4xl font-bold text-[#D4A843]">{stats.checkedIn}</p>
          <p className="text-sm text-white/70 mt-1">Checked In</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-5 text-center">
          <p className="text-4xl font-bold">{stats.total}</p>
          <p className="text-sm text-white/70 mt-1">Total Guests</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-6">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#D4A843] transition-all duration-500"
            style={{ width: stats.total > 0 ? `${(stats.checkedIn / stats.total) * 100}%` : "0%" }}
          />
        </div>
        <p className="text-xs text-white/50 mt-2 text-right">
          {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}% attendance
        </p>
      </div>

      {/* Scanner input */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl bg-white/10 p-6 space-y-4">
          <p className="text-sm font-medium text-white/80">Scan QR Code or Enter Code Manually</p>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="e.g. INV-A3X7P2"
              className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder:text-white/30 outline-none focus:border-[#D4A843] focus:ring-2 focus:ring-[#D4A843]/20"
            />
            <button
              onClick={() => handleCheckin()}
              disabled={loading || !code.trim()}
              className="rounded-xl bg-[#D4A843] px-5 py-3 text-sm font-bold text-[#0A2810] hover:bg-[#e6b84d] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="px-6">
          <div className={`rounded-2xl p-6 border-2 ${
            result.status === "success"
              ? "bg-emerald-900/50 border-emerald-500"
              : result.status === "already_checked_in"
              ? "bg-amber-900/50 border-amber-500"
              : "bg-red-900/50 border-red-500"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {result.status === "success" && <CheckCircle className="h-7 w-7 text-emerald-400" />}
              {result.status === "already_checked_in" && <AlertCircle className="h-7 w-7 text-amber-400" />}
              {(result.status === "invalid" || result.status === "declined") && <XCircle className="h-7 w-7 text-red-400" />}
              <p className="text-lg font-bold">
                {result.status === "success" && "Welcome!"}
                {result.status === "already_checked_in" && "Already Checked In"}
                {result.status === "invalid" && "Invalid Code"}
                {result.status === "declined" && "Declined RSVP"}
              </p>
            </div>
            {result.guest && (
              <>
                <p className="text-xl font-semibold text-white">{result.guest.name}</p>
                {result.guest.seatNumber && (
                  <p className="text-white/70 text-sm mt-1">Seat #{result.guest.seatNumber}</p>
                )}
              </>
            )}
            <p className="text-white/70 text-sm mt-2">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
