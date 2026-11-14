"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515]"
    >
      <Printer className="h-4 w-4" /> Print poster
    </button>
  );
}
