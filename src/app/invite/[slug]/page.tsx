// src/app/invite/[slug]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Download, Share2, MessageCircle } from "lucide-react";
import type { PublicEvent, PublicGuest } from "@/types";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

export default function InvitePage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [attendance, setAttendance] = useState("Yes");
  const [image, setImage] = useState<string | null>(null);
  const [guest, setGuest] = useState<PublicGuest | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invite/${slug}/event`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setEvent(data.event);
      })
      .catch(() => setNotFound(true))
      .finally(() => setEventLoading(false));
  }, [slug]);

  const verifyGuest = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMessage(null); setErrorMessage(null); setGuest(null);
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/invite/${slug}/check-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMessage(data.error); return; }
      setGuest(data.guest);
      setEmail(data.guest.email || "");
      if (data.guest.rsvp?.status === "CONFIRMED") setStatusMessage("You have already confirmed your RSVP. Download your card below.");
      if (data.guest.rsvp?.status === "DECLINED") setStatusMessage("Your response has been recorded as declined. Thank you.");
    } catch { setErrorMessage("Unable to reach the server. Please try again."); }
    finally { setIsVerifying(false); }
  };

  const submitRsvp = async (e: FormEvent) => {
    e.preventDefault();
    if (!guest) return;
    setStatusMessage(null); setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: guest.phone, email, attendance }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMessage(data.error); return; }
      setGuest(data.guest);
      setStatusMessage(data.message);
    } catch { setErrorMessage("Unable to submit. Please try again."); }
    finally { setIsSubmitting(false); }
  };

  const downloadCard = async () => {
    if (!guest?.rsvp?.uniqueCode) { setErrorMessage("No admission code found."); return; }
    setStatusMessage("Preparing your card…");
    try {
      const res = await fetch(`/api/invite/${slug}/generate-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: guest.rsvp.uniqueCode, imageBase64: image === "skip" ? null : image }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErrorMessage(b.error || "Failed to generate card"); setStatusMessage(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${guest.name.replace(/\s+/g, "_")}-invite-card.png`;
      a.click(); URL.revokeObjectURL(url);
      setStatusMessage("Your card is ready!");
    } catch (err) { setErrorMessage("Download failed. Please try again."); setStatusMessage(null); }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`You're invited to ${event?.name}!\n\nRSVP here: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const bg = event?.accentColor ?? "#F8F4E3";
  const primary = event?.primaryColor ?? "#0A2810";
  const secondary = event?.secondaryColor ?? "#B8860B";

  const hasResponded = guest?.rsvp?.status && guest.rsvp.status !== "PENDING";
  const showRsvpForm = Boolean(guest && (image || hasResponded));
  const needsPhoto = Boolean(guest && !image && !hasResponded && event?.requirePhoto);

  if (eventLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: primary }} />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <p className="text-4xl mb-4">404</p>
        <p className="text-stone-600">This invitation link is not valid or has expired.</p>
      </div>
    </div>
  );

  const eventDate = new Date(event.date).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="min-h-screen py-12 px-4" style={{ background: bg }}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Hero card */}
        <section className="rounded-3xl bg-white/90 backdrop-blur p-10 shadow-xl text-center border" style={{ borderColor: secondary + "40" }}>
          {event.logoUrl && <img src={event.logoUrl} alt="" className="h-20 w-20 rounded-full object-cover mx-auto mb-6 border-4" style={{ borderColor: secondary }} />}
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: secondary }}>
            You're Invited
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4" style={{ color: primary }}>
            {event.name}
          </h1>
          {event.description && <p className="text-stone-600 mb-6 leading-relaxed">{event.description}</p>}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl p-4" style={{ background: bg }}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: secondary }}>Date</p>
              <p className="font-semibold text-stone-800 text-sm">{eventDate}</p>
              {event.time && <p className="text-stone-500 text-sm">{event.time}</p>}
            </div>
            <div className="rounded-2xl p-4" style={{ background: bg }}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: secondary }}>Venue</p>
              <p className="font-semibold text-stone-800 text-sm">{event.venue}</p>
            </div>
          </div>

          {event.dressCode && (
            <p className="mt-4 text-sm" style={{ color: secondary }}>
              Dress Code: <strong>{event.dressCode}</strong>
            </p>
          )}

          {/* Share buttons */}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={shareWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
            </button>
            <button
              onClick={() => navigator.share?.({ title: event.name, url: window.location.href })}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </section>

        {/* RSVP section */}
        <section className="rounded-3xl bg-white/95 p-8 shadow-xl border" style={{ borderColor: secondary + "40" }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: primary }}>Verify Your Invitation</h2>
          <p className="text-stone-500 text-sm mb-6">Enter the phone number used for your invitation to verify and RSVP.</p>

          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
          )}
          {statusMessage && (
            <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div>
          )}

          <form onSubmit={verifyGuest} className="space-y-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:ring-2 transition"
              style={{ "--tw-ring-color": primary + "30" } as any}
            />
            <button
              type="submit"
              disabled={isVerifying || !phone}
              className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: primary }}
            >
              {isVerifying ? "Verifying…" : "Verify Invitation"}
            </button>
          </form>

          {/* Photo upload */}
          {needsPhoto && (
            <div className="mt-8 rounded-2xl p-6 border" style={{ background: bg, borderColor: secondary + "40" }}>
              <h3 className="font-semibold mb-2" style={{ color: primary }}>Upload Your Photo</h3>
              <p className="text-sm text-stone-500 mb-4">A recent photo is required for your admission card.</p>
              <input
                type="file" accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-stone-600 file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:cursor-pointer"
                style={{ "--file-bg": primary } as any}
              />
            </div>
          )}

          {/* Guest returning — photo optional */}
          {guest && !image && hasResponded && (
            <div className="mt-6 rounded-2xl p-6 border" style={{ background: bg, borderColor: secondary + "40" }}>
              <h3 className="font-semibold mb-2" style={{ color: primary }}>
                Update Photo <span className="text-sm font-normal text-stone-500">(optional)</span>
              </h3>
              <div className="flex flex-col gap-3">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-stone-600" />
                <button
                  type="button"
                  onClick={() => setImage("skip")}
                  className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Skip — download without photo
                </button>
              </div>
            </div>
          )}

          {/* RSVP form */}
          {showRsvpForm && (
            <div className="mt-8 rounded-2xl p-6 border" style={{ borderColor: secondary + "40" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ background: primary }}>
                  {guest!.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-stone-900">{guest!.name}</p>
                  <p className="text-sm text-stone-500">{guest!.phone}</p>
                </div>
              </div>

              {!hasResponded && (
                <form onSubmit={submitRsvp} className="space-y-4">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    type="email"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:ring-2"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {["Yes", "No"].map((v) => (
                      <label key={v} className={`flex items-center gap-2 rounded-2xl border cursor-pointer px-4 py-3 transition ${attendance === v ? "border-stone-800 bg-stone-50" : "border-stone-200"}`}>
                        <input type="radio" name="attendance" value={v} checked={attendance === v} onChange={() => setAttendance(v)} className="h-4 w-4" />
                        <span className="text-sm font-medium">{v === "Yes" ? "Yes, I'll attend" : "No, I can't make it"}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                    style={{ background: primary }}
                  >
                    {isSubmitting ? "Submitting…" : "Submit RSVP"}
                  </button>
                </form>
              )}

              {guest?.rsvp?.status === "CONFIRMED" && (
                <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-emerald-800">RSVP Confirmed!</p>
                  </div>
                  {guest.rsvp.seatNumber && (
                    <p className="text-sm text-emerald-700 mb-4">Seat #{guest.rsvp.seatNumber}</p>
                  )}
                  <button
                    onClick={downloadCard}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
                    style={{ background: primary }}
                  >
                    <Download className="h-4 w-4" /> Download Admission Card
                  </button>
                </div>
              )}

              {guest?.rsvp?.status === "DECLINED" && (
                <div className="mt-4 rounded-2xl bg-stone-50 border border-stone-200 p-5">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-stone-500" />
                    <p className="font-semibold text-stone-700">Response Recorded</p>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">Sorry you can't make it. Thank you for letting us know. ❤️</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
