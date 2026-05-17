// src/components/events/publish-toggle.tsx
"use client";

import { useState } from "react";
import { Globe, EyeOff, Loader2 } from "lucide-react";

type Props = { eventId: string; isPublished: boolean };

export function PublishToggle({ eventId, isPublished: initial }: Props) {
  const [isPublished, setIsPublished] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      setIsPublished(!isPublished);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        isPublished
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          : "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <Globe className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
      {isPublished ? "Published" : "Draft"}
    </button>
  );
}
