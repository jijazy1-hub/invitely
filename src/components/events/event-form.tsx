// src/components/events/event-form.tsx
// The event details form, shared by "Create event" and "Edit event".
"use client";

import { useState } from "react";
import { Loader2, ImagePlus, Trash2, AlertTriangle } from "lucide-react";
import type { EventType } from "@/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from "@/types";
import { validateEvent, type EventInput, type FieldErrors } from "@/lib/event-validation";

const EVENT_TYPES = Object.entries(EVENT_TYPE_LABELS) as [EventType, string][];

export type SubmitResult = { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const inputBase = "w-full rounded-lg border bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 transition";
const inputCls = (err?: string) =>
  `${inputBase} ${err ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-stone-200 focus:border-[#0A2810] focus:ring-[#0A2810]/10"}`;

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

// Logo: square-cropped, 400px JPEG.
async function prepareLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 400, 400);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 400, 400);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function EventForm({
  mode,
  initial,
  appUrl,
  hasCustomDesign,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: EventInput;
  appUrl?: string;
  hasCustomDesign?: boolean;
  onSubmit: (values: EventInput) => Promise<SubmitResult>;
}) {
  const [form, setForm] = useState<EventInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const update = <K extends keyof EventInput>(key: K, value: EventInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const slugChanged = mode === "edit" && form.slug !== initial.slug;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    const toCheck: Partial<EventInput> = { ...form };
    if (mode === "create") delete toCheck.slug;
    const errs = validateEvent(toCheck, { isNew: true });
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please fix the highlighted fields.");
      document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      const r = await onSubmit(form);
      if (r.ok) {
        setSaved(true);
      } else {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error ?? "Couldn't save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    try {
      update("logoUrl", await prepareLogo(file));
    } catch {
      setErrors((x) => ({ ...x, logoUrl: "We couldn't read that image. Use a JPG or PNG." }));
    } finally {
      setLogoBusy(false);
    }
  };

  const text = (key: keyof EventInput, label: string, placeholder: string, opts: { type?: string; hint?: string; required?: boolean } = {}) => (
    <Field label={label + (opts.required ? " *" : "")} error={errors[key]} hint={opts.hint}>
      <input
        type={opts.type ?? "text"}
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value as never)}
        placeholder={placeholder}
        aria-invalid={!!errors[key]}
        min={opts.type === "date" ? "2000-01-01" : undefined}
        max={opts.type === "date" ? "2100-12-31" : undefined}
        className={inputCls(errors[key])}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
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
                form.eventType === type ? "border-[#0A2810] bg-[#0A2810] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <span className="text-xl">{EVENT_TYPE_ICONS[type]}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        {errors.eventType && <p className="text-xs text-red-600">{errors.eventType}</p>}
      </div>

      {/* Details */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Event Details</h2>
        {text("name", "Event name", "e.g. Joe & Fatima's Wedding", { required: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("date", "Date", "", { type: "date", required: true, hint: "Check the year, e.g. 2026" })}
          {text("time", "Time", "", { type: "time" })}
        </div>
        {text("venue", "Venue", "e.g. The Grand Ballroom, Eko Hotel, Lagos", { required: true })}
        {text("dressCode", "Dress code", "e.g. Emerald & Gold / Black Tie")}
        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="A short note shown on the invite page"
            rows={3}
            aria-invalid={!!errors.description}
            className={inputCls(errors.description)}
          />
        </Field>
        {text("rsvpDeadline", "RSVP deadline", "", { type: "date", hint: "Optional. Must be on or before the event date." })}
      </div>

      {/* Organiser */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Organiser</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("organizerName", "Name", "e.g. Joe Ameh")}
          {text("organizerPhone", "Phone", "e.g. 08012345678", { type: "tel" })}
        </div>
        {text("organizerEmail", "Email", "e.g. joe@gmail.com", { type: "email", hint: "Guests' replies to the confirmation email go here." })}
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold text-stone-900">Logo / Monogram</h2>
        <p className="text-xs text-stone-500">Shown at the top of the invite page. Square images look best.</p>
        <div className="flex flex-wrap items-center gap-3">
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="" className="h-16 w-16 rounded-full border border-stone-200 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-stone-300 text-xs text-stone-400">None</div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {form.logoUrl ? "Change logo" : "Upload logo"}
            <input type="file" accept="image/jpeg,image/png,image/*" className="sr-only" onChange={onLogo} />
          </label>
          {form.logoUrl && (
            <button type="button" onClick={() => update("logoUrl", "")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
        {errors.logoUrl && <p className="text-xs text-red-600">{errors.logoUrl}</p>}
      </div>

      {/* Colours */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Colours</h2>
        {hasCustomDesign && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            These colours are used on the invite page. This event uses a Card Designer design, so the admission card&apos;s colours are set in the Card Designer.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ["primaryColor", "Primary"],
            ["secondaryColor", "Secondary / gold"],
            ["accentColor", "Background"],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label} error={errors[key]}>
              <div className="flex items-center gap-3">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form[key]) ? form[key] : "#000000"} onChange={(e) => update(key, e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200" />
                <input value={form[key]} onChange={(e) => update(key, e.target.value)} aria-invalid={!!errors[key]} className={inputCls(errors[key]) + " font-mono text-xs"} />
              </div>
            </Field>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Options</h2>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={form.requirePhoto} onChange={(e) => update("requirePhoto", e.target.checked)} className="h-4 w-4 rounded accent-[#0A2810]" />
          <div>
            <p className="text-sm font-medium text-stone-900">Require guest photo</p>
            <p className="text-xs text-stone-500">Guests must add a photo before they RSVP (it&apos;s shown at check-in).</p>
          </div>
        </label>
      </div>

      {/* Link (edit only) */}
      {mode === "edit" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-3">
          <h2 className="font-semibold text-stone-900">Invite link</h2>
          <Field label="Link name" error={errors.slug} hint="Lowercase letters, numbers and dashes.">
            <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 focus-within:ring-2 focus-within:ring-[#0A2810]/10">
              <span className="shrink-0 border-r border-stone-200 bg-stone-100 px-3 py-2.5 text-xs text-stone-500">{(appUrl ?? "").replace(/^https?:\/\//, "")}/invite/</span>
              <input
                value={form.slug}
                onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                aria-invalid={!!errors.slug}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-stone-900 outline-none"
              />
            </div>
          </Field>
          {slugChanged && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Changing the link breaks the old one: invite links you&apos;ve already sent, printed check-in posters and staff scanner links will stop working. Re-share them after saving.
            </p>
          )}
        </div>
      )}

      {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
      {saved && mode === "edit" && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Changes saved.</div>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A2810] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f3515] disabled:opacity-60"
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : mode === "create" ? "Create Event" : "Save changes"}
      </button>
    </form>
  );
}
