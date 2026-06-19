// src/app/(dashboard)/events/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { EventType } from "@prisma/client";
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from "@/types";

const EVENT_TYPES = Object.entries(EVENT_TYPE_LABELS) as [EventType, string][];

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    eventType: "WEDDING" as EventType,
    date: "",
    time: "",
    venue: "",
    description: "",
    dressCode: "",
    rsvpDeadline: "",
    organizerName: "",
    organizerPhone: "",
    primaryColor: "#0A2810",
    secondaryColor: "#B8860B",
    accentColor: "#F8F4E3",
    requirePhoto: true,
  });

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }
      router.push(`/events/${data.id}/guests`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("The server returned an invalid response while creating the event.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/events" className="text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Create Event</h1>
          <p className="text-sm text-stone-500">Set up a new invitation event</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event type */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Event Type</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {EVENT_TYPES.map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => update("eventType", type)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                  form.eventType === type
                    ? "border-[#0A2810] bg-[#0A2810] text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                <span className="text-xl">{EVENT_TYPE_ICONS[type]}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Basic details */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Event Details</h2>

          <Field label="Event Name *">
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Gabby & Esther's Wedding"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date *">
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Venue *">
            <input
              required
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              placeholder="e.g. The Grand Ballroom, Eko Hotel"
              className={inputCls}
            />
          </Field>

          <Field label="Dress Code">
            <input
              value={form.dressCode}
              onChange={(e) => update("dressCode", e.target.value)}
              placeholder="e.g. Black Tie / Formal"
              className={inputCls}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Brief description of the event..."
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="RSVP Deadline">
            <input
              type="date"
              value={form.rsvpDeadline}
              onChange={(e) => update("rsvpDeadline", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Organizer */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Organizer Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Organizer Name">
              <input
                value={form.organizerName}
                onChange={(e) => update("organizerName", e.target.value)}
                placeholder="e.g. Gabby Okafor"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.organizerPhone}
                onChange={(e) => update("organizerPhone", e.target.value)}
                placeholder="e.g. 08012345678"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Branding Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "primaryColor", label: "Primary" },
              { key: "secondaryColor", label: "Secondary" },
              { key: "accentColor", label: "Accent / Background" },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => update(key, e.target.value)}
                    className="h-10 w-10 rounded-lg border border-stone-200 cursor-pointer"
                  />
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => update(key, e.target.value)}
                    className={inputCls + " font-mono text-xs"}
                  />
                </div>
              </Field>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Options</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requirePhoto}
              onChange={(e) => update("requirePhoto", e.target.checked)}
              className="h-4 w-4 rounded accent-[#0A2810]"
            />
            <div>
              <p className="text-sm font-medium text-stone-900">Require guest photo</p>
              <p className="text-xs text-stone-500">Guests must upload a photo before RSVPing</p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A2810] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Event"}
        </button>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}
