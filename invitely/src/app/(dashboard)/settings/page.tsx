"use client";

// src/app/(dashboard)/settings/page.tsx
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Settings, Bell, Shield, User, Check, Loader2 } from "lucide-react";

interface SettingsState {
  displayName: string;
  organizerName: string;
  organizerPhone: string;
  emailOnRsvp: boolean;
  emailOnCheckin: boolean;
  whatsappShare: boolean;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-stone-900">{title}</h2>
        <p className="text-sm text-stone-400 mt-0.5">{description}</p>
      </div>
      <hr className="border-stone-100" />
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-none ${
          checked ? "bg-[#0A2810] border-[#0A2810]" : "bg-stone-200 border-stone-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          } mt-0.5`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

  const [form, setForm] = useState<SettingsState>({
    displayName: "",
    organizerName: "",
    organizerPhone: "",
    emailOnRsvp: true,
    emailOnCheckin: false,
    whatsappShare: true,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        displayName: user.fullName ?? user.firstName ?? "",
      }));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save — in production, POST to /api/settings
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (key: keyof SettingsState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (!isLoaded) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0A2810]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#0A2810]/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-[#0A2810]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
          <p className="text-stone-500 text-sm">Manage your account preferences</p>
        </div>
      </div>

      {/* Profile */}
      <Section
        title="Profile"
        description="Your public-facing information on invitation pages"
      >
        <div className="flex items-center gap-4 mb-4">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-[#0A2810] flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <p className="font-medium text-stone-900 text-sm">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Managed via Clerk — update your avatar in account settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2810]/20 focus:border-[#0A2810]"
              placeholder="Your name"
              {...field("displayName")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Default Organizer Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2810]/20 focus:border-[#0A2810]"
              placeholder="Shown on invitation cards"
              {...field("organizerName")}
            />
            <p className="text-xs text-stone-400 mt-1">
              Pre-filled when you create a new event. You can override per event.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Default Organizer Phone
            </label>
            <input
              type="tel"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2810]/20 focus:border-[#0A2810]"
              placeholder="+234…"
              {...field("organizerPhone")}
            />
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        description="Control when Invitely sends you email alerts"
      >
        <div className="space-y-5">
          <Toggle
            label="RSVP alerts"
            description="Email me when a guest confirms or declines"
            checked={form.emailOnRsvp}
            onChange={(v) => setForm((f) => ({ ...f, emailOnRsvp: v }))}
          />
          <Toggle
            label="Check-in alerts"
            description="Email me when a guest checks in at the venue"
            checked={form.emailOnCheckin}
            onChange={(v) => setForm((f) => ({ ...f, emailOnCheckin: v }))}
          />
        </div>
      </Section>

      {/* Guest experience */}
      <Section
        title="Guest Experience"
        description="Customise what guests see on your invitation pages"
      >
        <Toggle
          label="WhatsApp share button"
          description="Show a 'Share on WhatsApp' button after guests receive their card"
          checked={form.whatsappShare}
          onChange={(v) => setForm((f) => ({ ...f, whatsappShare: v }))}
        />
      </Section>

      {/* Account */}
      <Section title="Account" description="Your Invitely account and data">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">Account ID</p>
              <p className="text-xs text-stone-400 font-mono mt-0.5">{user?.id}</p>
            </div>
            <Shield className="h-4 w-4 text-stone-300" />
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Danger Zone</p>
            <p className="text-xs text-red-500 mb-3">
              Deleting your account is permanent and will remove all your events, guests, and data.
            </p>
            <button
              disabled
              className="rounded-lg bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 opacity-60 cursor-not-allowed"
            >
              Delete Account — contact support
            </button>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0A2810] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Notifications bell indicator */}
      {saved && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-[#0A2810] px-5 py-3 shadow-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-white" />
          <span className="text-white text-sm font-medium">Settings saved</span>
        </div>
      )}
    </div>
  );
}
