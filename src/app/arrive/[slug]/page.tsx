// src/app/arrive/[slug]/page.tsx
// Where the check-in QR poster on the wall leads. Guests check themselves in on
// their own phone; the success screen shows their photo, name and seat so an
// usher can see at a glance that it's really them.
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle, Loader2, QrCode } from "lucide-react";
import type { PublicEvent } from "@/types";

type Result = {
  status: "success" | "already_checked_in" | "invalid" | "too_early" | "closed";
  message: string;
  guest?: { name: string; seatNumber: number | null; photo: string | null };
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default function ArrivePage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [mode, setMode] = useState<"code" | "phone">("code");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [checkedAt, setCheckedAt] = useState<string>("");

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    if (fromLink) setCode(fromLink.toUpperCase());
    fetch(`/api/invite/${slug}/event`)
      .then((r) => r.json())
      .then((d) => setEvent(d.event ?? null))
      .catch(() => setEvent(null))
      .finally(() => setLoadingEvent(false));
  }, [slug]);

  const canSubmit = mode === "code" ? !!code.trim() : !!phone.trim() && !!email.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/arrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "code" ? { slug, code } : { slug, phone, email }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(data.status ? data : { status: "invalid", message: data.error || "Please try again." });
      setCheckedAt(new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" }));
    } catch {
      setResult({ status: "invalid", message: "No connection. Please try again or see an usher." });
    } finally {
      setBusy(false);
    }
  };

  const primary = event?.primaryColor ?? "#0A2810";
  const gold = event?.secondaryColor ?? "#B8860B";

  if (loadingEvent) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }
  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center text-stone-600">This check-in link isn&apos;t active.</div>;
  }

  const ok = (result?.status === "success" || result?.status === "already_checked_in") && result.guest;

  // ── Success: big photo + name, for the usher to see ──
  if (ok && result?.guest) {
    const g = result.guest;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: primary }}>
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
            <CheckCircle className="h-4 w-4" /> {result.status === "success" ? "CHECKED IN" : "ALREADY CHECKED IN"}
          </div>
          <div className="mt-6 flex justify-center">
            {g.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.photo} alt={g.name} className="h-56 w-56 rounded-full object-cover shadow-lg" style={{ border: `6px solid ${gold}` }} />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-full text-7xl font-bold text-white shadow-lg" style={{ background: primary, border: `6px solid ${gold}` }}>
                {initials(g.name) || "G"}
              </div>
            )}
          </div>
          <p className="mt-6 text-3xl font-bold leading-tight text-stone-900">{g.name}</p>
          <p className="mt-1 text-stone-500">Welcome to {event.name}</p>
          {g.seatNumber ? (
            <div className="mt-6 inline-block rounded-2xl px-10 py-4 text-white" style={{ background: primary }}>
              <p className="text-xs font-bold tracking-[0.3em]" style={{ color: gold }}>YOUR SEAT</p>
              <p className="text-5xl font-bold">{g.seatNumber}</p>
            </div>
          ) : null}
          <p className="mt-6 text-xs text-stone-400">Show this screen to an usher · {checkedAt}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: primary }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.3em]" style={{ color: gold }}>WELCOME TO</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">{event.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{event.venue}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
          {(["code", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setResult(null); }}
              className={`rounded-lg py-2 ${mode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
            >
              {m === "code" ? "Check-in code" : "Phone & email"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "code" ? (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Your check-in code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="INV-XXXXXXXX"
                autoCapitalize="characters"
                autoComplete="off"
                className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-4 text-center font-mono text-xl tracking-widest text-stone-900 outline-none focus:ring-2"
              />
              <span className="mt-1 block text-xs text-stone-500">It&apos;s on your admission card and in your confirmation email.</span>
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Phone number you were invited with</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  type="tel"
                  inputMode="tel"
                  className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-base text-stone-900 outline-none focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Email you used when you confirmed</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. you@gmail.com"
                  type="email"
                  className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-base text-stone-900 outline-none focus:ring-2"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white disabled:opacity-60"
            style={{ background: primary }}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />} Check me in
          </button>
          {result && (
            <div className={`flex items-start gap-2 rounded-2xl p-4 text-sm ${result.status === "too_early" || result.status === "closed" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>
              {result.status === "too_early" || result.status === "closed" ? <AlertCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
