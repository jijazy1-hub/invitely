// src/components/admin/sync-users-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function SyncUsersButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const run = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync-users", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setIsError(false);
      setMessage(
        `Synced ${data.synced} user${data.synced === 1 ? "" : "s"} from Clerk.${data.truncated ? " (Stopped at the first 1,000.)" : ""}`
      );
      router.refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-[#0A2810] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync from Clerk
      </button>
      {message && <span className={`text-xs ${isError ? "text-red-600" : "text-emerald-700"}`}>{message}</span>}
    </div>
  );
}
