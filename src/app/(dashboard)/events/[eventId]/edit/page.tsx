// src/app/(dashboard)/events/[eventId]/edit/page.tsx
// Edit every detail of an event, or delete it.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { EventForm, type SubmitResult } from "@/components/events/event-form";
import { toDateInput, type EventInput } from "@/lib/event-validation";

/** "2:00 PM" (older events) → "14:00" for the time picker. */
function toTimeInput(t: string | null | undefined): string {
  if (!t) return "";
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t;
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

export default function EditEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<EventInput | null>(null);
  const [meta, setMeta] = useState<{ name: string; hasCustomDesign: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then(async (r) => {
        const e = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(e.error || "Couldn't load this event.");
        setInitial({
          name: e.name ?? "",
          eventType: e.eventType ?? "OTHER",
          date: toDateInput(e.date),
          time: toTimeInput(e.time),
          venue: e.venue ?? "",
          description: e.description ?? "",
          dressCode: e.dressCode ?? "",
          rsvpDeadline: toDateInput(e.rsvpDeadline),
          organizerName: e.organizerName ?? "",
          organizerPhone: e.organizerPhone ?? "",
          organizerEmail: e.organizerEmail ?? "",
          primaryColor: e.primaryColor ?? "#0A2810",
          secondaryColor: e.secondaryColor ?? "#B8860B",
          accentColor: e.accentColor ?? "#F8F4E3",
          requirePhoto: !!e.requirePhoto,
          logoUrl: e.logoUrl ?? "",
          slug: e.slug ?? "",
        });
        setMeta({ name: e.name ?? "", hasCustomDesign: e.template?.category === "CUSTOM_DESIGN" });
      })
      .catch((err) => setLoadError(err.message));
  }, [eventId]);

  const save = async (v: EventInput): Promise<SubmitResult> => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error, fieldErrors: data.fieldErrors };
      setMeta((m) => (m ? { ...m, name: data.name ?? m.name } : m));
      setInitial((prev) => (prev ? { ...v, logoUrl: data.logoUrl ?? "" } : prev));
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "No connection. Please try again." };
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Couldn't delete the event.");
        return;
      }
      router.push("/events");
    } finally {
      setDeleting(false);
    }
  };

  if (loadError) return <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>;
  if (!initial || !meta) return <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/events/${eventId}`} className="text-stone-500 hover:text-stone-800"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-stone-900">Edit Event</h1>
          <p className="truncate text-sm text-stone-500">{meta.name}</p>
        </div>
      </div>

      <EventForm key={initial.slug + initial.logoUrl.length} mode="edit" initial={initial} appUrl={appUrl} hasCustomDesign={meta.hasCustomDesign} onSubmit={save} />

      <div className="rounded-xl border border-red-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold text-red-700">Delete event</h2>
        <p className="text-sm text-stone-600">
          This permanently deletes the event with its guest list, RSVPs, photos and check-ins. Invite links and posters stop working. This can&apos;t be undone.
        </p>
        <label className="block text-xs font-medium text-stone-600">
          Type the event name <b className="text-stone-900">{meta.name}</b> to confirm
          <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
        </label>
        <button
          onClick={remove}
          disabled={deleting || deleteText.trim() !== meta.name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete event
        </button>
      </div>
    </div>
  );
}
