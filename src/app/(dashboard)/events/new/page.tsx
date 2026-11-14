// src/app/(dashboard)/events/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventForm, type SubmitResult } from "@/components/events/event-form";
import type { EventInput } from "@/lib/event-validation";

const EMPTY: EventInput = {
  name: "", eventType: "WEDDING", date: "", time: "", venue: "", description: "", dressCode: "", rsvpDeadline: "",
  organizerName: "", organizerPhone: "", organizerEmail: "",
  primaryColor: "#0A2810", secondaryColor: "#B8860B", accentColor: "#F8F4E3",
  requirePhoto: true, logoUrl: "", slug: "",
};

export default function NewEventPage() {
  const router = useRouter();

  const create = async (v: EventInput): Promise<SubmitResult> => {
    try {
      const { logoUrl, slug: _slug, ...fields } = v;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || "Failed to create event", fieldErrors: data.fieldErrors };
      if (logoUrl) {
        await fetch(`/api/events/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl }),
        }).catch(() => undefined);
      }
      router.push(`/events/${data.id}/guests`);
      return { ok: true };
    } catch {
      return { ok: false, error: "No connection. Please try again." };
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/events" className="text-stone-500 hover:text-stone-800 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Create Event</h1>
          <p className="text-sm text-stone-500">Set up a new invitation event</p>
        </div>
      </div>
      <EventForm mode="create" initial={EMPTY} onSubmit={create} />
    </div>
  );
}
