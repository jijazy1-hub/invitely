export const dynamic = "force-dynamic";
"use client";

// src/app/(dashboard)/templates/page.tsx
import { useEffect, useState } from "react";
import { Palette, Lock, Globe, CheckCircle } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isPublic: boolean;
  config: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  BIRTHDAY: "Birthday",
  CONFERENCE: "Conference",
  CONCERT: "Concert",
  CHURCH: "Church",
  SEMINAR: "Seminar",
  VIP_PARTY: "VIP Party",
  BURIAL: "Burial",
  PRIVATE_DINNER: "Private Dinner",
  OTHER: "Other",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  WEDDING: "💍",
  BIRTHDAY: "🎂",
  CONFERENCE: "🎤",
  CONCERT: "🎵",
  CHURCH: "⛪",
  SEMINAR: "📋",
  VIP_PARTY: "🥂",
  BURIAL: "🕊️",
  PRIVATE_DINNER: "🍽️",
  OTHER: "✨",
};

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  const { primaryColor = "#0A2810", secondaryColor = "#B8860B", accentColor = "#F8F4E3" } =
    template.config;

  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all ${
        selected
          ? "border-[#0A2810] shadow-lg shadow-[#0A2810]/10"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      {/* Preview swatch */}
      <div
        className="h-32 w-full relative flex items-center justify-center"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Decorative card preview */}
        <div
          className="rounded-xl px-5 py-3 text-center shadow-lg"
          style={{ backgroundColor: accentColor, borderColor: secondaryColor, borderWidth: 1 }}
        >
          <div
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: primaryColor }}
          >
            {CATEGORY_EMOJIS[template.category] ?? "✨"}{" "}
            {CATEGORY_LABELS[template.category] ?? template.category}
          </div>
          <div className="text-xs font-medium" style={{ color: secondaryColor }}>
            Invitation Card
          </div>
        </div>

        {/* Color dots */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {[primaryColor, secondaryColor, accentColor].map((c, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border-2 border-white/40"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Visibility badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              template.isPublic
                ? "bg-white/20 text-white"
                : "bg-black/30 text-white"
            }`}
          >
            {template.isPublic ? (
              <Globe className="h-2.5 w-2.5" />
            ) : (
              <Lock className="h-2.5 w-2.5" />
            )}
            {template.isPublic ? "Public" : "Private"}
          </span>
        </div>

        {selected && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-[#0A2810]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-white">
        <h3 className="font-semibold text-stone-900 text-sm">{template.name}</h3>
        {template.description && (
          <p className="text-xs text-stone-400 mt-1 leading-relaxed line-clamp-2">
            {template.description}
          </p>
        )}
        <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
          {CATEGORY_LABELS[template.category] ?? template.category}
        </span>
      </div>
    </button>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["ALL", ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered =
    filter === "ALL" ? templates : templates.filter((t) => t.category === filter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#0A2810]/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-[#0A2810]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Templates</h1>
          <p className="text-stone-500 text-sm">Choose a design for your invitation cards</p>
        </div>
      </div>

      {/* Filter tabs */}
      {!loading && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-[#0A2810] text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {cat === "ALL" ? "All Templates" : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
              <div className="h-32 bg-stone-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded w-2/3" />
                <div className="h-3 bg-stone-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-16 text-center">
          <Palette className="h-10 w-10 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">No templates found</p>
          <p className="text-stone-400 text-sm mt-1">
            {filter !== "ALL"
              ? "No templates for this category yet."
              : "Templates will appear here once added."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selected === t.id}
              onSelect={() => setSelected(selected === t.id ? null : t.id)}
            />
          ))}
        </div>
      )}

      {/* Selection CTA */}
      {selected && (
        <div className="sticky bottom-6 flex justify-center">
          <div className="rounded-2xl bg-[#0A2810] px-6 py-3 shadow-xl flex items-center gap-4">
            <span className="text-white text-sm font-medium">
              Template selected — use it when creating a new event
            </span>
            <button
              onClick={() => setSelected(null)}
              className="text-white/60 hover:text-white text-xs underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
