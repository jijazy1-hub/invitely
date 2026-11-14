// src/app/checkin/[slug]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CameraScanner } from "@/components/checkin/camera-scanner";
import { QrCode, CheckCircle, XCircle, AlertCircle, Loader2, RotateCcw, Lock } from "lucide-react";

type CheckinResult = {
  status: "success" | "already_checked_in" | "invalid" | "declined" | "unauthorized";
  message: string;
  guest?: { name: string; seatNumber?: number; photo?: string | null };
};

export default function CheckinPage() {
  const { slug } = useParams<{ slug: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [stats, setStats] = useState({ checkedIn: 0, total: 0 });
  const [denied, setDenied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Staff link key (?key=...). Sent as a header so it isn't repeated in every URL.
  const keyRef = useRef<string | null>(null);

  const authHeaders = (): Record<string, string> =>
    keyRef.current ? { "x-checkin-key": keyRef.current } : {};

  useEffect(() => {
    keyRef.current = new URLSearchParams(window.location.search).get("key");
    fetchStats().finally(() => setReady(true));
    // Auto-focus input for QR scanner
    inputRef.current?.focus();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/checkin?slug=${encodeURIComponent(slug)}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setDenied(data.error ?? "You don't have access to this scanner.");
        return;
      }
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
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ slug, code: useCode }),
      });
      const data = await res.json();
      if (data.status === "unauthorized") { setDenied(data.message); return; }
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

  const closeResult = () => {
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Successful check-ins close on their own so staff can keep scanning.
  useEffect(() => {
    if (result?.status !== "success") return;
    const t = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(t);
  }, [result]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheckin();
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0A2810] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0A2810] text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <Lock className="h-10 w-10 text-[#D4A843] mx-auto" />
          <p className="text-xl font-bold">Check-in is restricted</p>
          <p className="text-sm text-white/70">{denied}</p>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(`/checkin/${slug}`)}`}
            className="inline-block rounded-xl bg-[#D4A843] px-5 py-3 text-sm font-bold text-[#0A2810] hover:bg-[#e6b84d]"
          >
            Organiser sign in
          </Link>
        </div>
      </div>
    );
  }

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
          <CameraScanner paused={loading || !!result} onCode={(c) => handleCheckin(c)} />
          <p className="text-sm font-medium text-white/80 pt-2">Or type the code / use a USB scanner</p>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="e.g. INV-A3X7P2KQ"
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

      {/* Result: full-screen pop-up so door staff can read it at a glance */}
      {result && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: result.status === "success" ? "#059669" : result.status === "already_checked_in" ? "#D97706" : "#DC2626" }}
          onClick={closeResult}
        >
          <div className="px-6 pt-10 pb-6 text-center text-white">
            <div className="flex justify-center">
              {result.status === "success" && <CheckCircle className="h-12 w-12" />}
              {result.status === "already_checked_in" && <AlertCircle className="h-12 w-12" />}
              {(result.status === "invalid" || result.status === "declined") && <XCircle className="h-12 w-12" />}
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-wide">
              {result.status === "success" && "✓ INVITED: ADMIT"}
              {result.status === "already_checked_in" && "ALREADY CHECKED IN"}
              {result.status === "invalid" && (result.guest ? "✗ NOT CONFIRMED" : "✗ NOT ON GUEST LIST")}
              {result.status === "declined" && "✗ DECLINED"}
            </p>
            <p className="mt-1 text-sm text-white/85">{result.message}</p>
          </div>
          <div className="flex-1 rounded-t-3xl bg-white px-6 pt-8 pb-8 text-center" onClick={(e) => e.stopPropagation()}>
            {result.guest ? (
              <>
                <div className="flex justify-center">
                  {result.guest.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.guest.photo} alt={result.guest.name} className="h-56 w-56 rounded-3xl object-cover shadow-lg" />
                  ) : (
                    <div className="flex h-56 w-56 flex-col items-center justify-center rounded-3xl bg-stone-100 text-stone-400">
                      <span className="text-7xl font-bold">{result.guest.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}</span>
                      <span className="mt-2 text-xs text-stone-500">No photo on file: check ID</span>
                    </div>
                  )}
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-stone-400">Full name</p>
                <p className="mt-1 text-3xl font-bold leading-tight text-stone-900">{result.guest.name}</p>
                {result.guest.seatNumber ? (
                  <p className="mt-3 inline-block rounded-full bg-stone-900 px-6 py-2 text-lg font-bold text-white">Seat {result.guest.seatNumber}</p>
                ) : null}
                {result.status === "success" && <p className="mt-4 text-sm text-stone-500">Compare the photo with the person&apos;s face.</p>}
              </>
            ) : (
              <div className="py-8">
                <p className="text-6xl">⛔</p>
                <p className="mt-4 text-lg font-semibold text-stone-900">Do not admit</p>
                <p className="mt-1 text-sm text-stone-500">This code isn&apos;t on the guest list for this event.</p>
              </div>
            )}
            <button onClick={closeResult} className="mt-8 w-full rounded-2xl bg-[#0A2810] py-4 text-lg font-bold text-white">
              Next guest
            </button>
            {result.status === "success" && <p className="mt-2 text-xs text-stone-400">Closes by itself in a few seconds</p>}
          </div>
        </div>
      )}
    </div>
  );
}
