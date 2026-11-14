// src/components/invite/card-download-modal.tsx
// Pop-up shown while a guest's admission card is made and downloaded.
// Bottom sheet on phones, centred dialog on larger screens.
"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, Download, Share2, X, RotateCw } from "lucide-react";

export type DownloadState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "ready"; url: string; blob: Blob; fileName: string }
  | { phase: "error"; message: string };

const STEPS = ["Adding your details…", "Drawing your card…", "Adding your QR code…", "Almost done…"];

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Saves a file: a normal download, kept alive long enough for every browser. */
export function triggerDownload(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function CardDownloadModal({
  state,
  color,
  onClose,
  onRetry,
}: {
  state: DownloadState;
  color: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [step, setStep] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const ios = isIOS();

  // Cycle the friendly progress text while the card is being made.
  useEffect(() => {
    if (state.phase !== "preparing") return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1200);
    return () => clearInterval(t);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "ready") return;
    try {
      const file = new File([state.blob], state.fileName, { type: "image/png" });
      setCanShare(!!navigator.canShare?.({ files: [file] }));
    } catch {
      setCanShare(false);
    }
  }, [state]);

  // Lock page scroll while open.
  useEffect(() => {
    if (state.phase === "idle") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [state.phase]);

  if (state.phase === "idle") return null;

  const share = async () => {
    if (state.phase !== "ready") return;
    try {
      const file = new File([state.blob], state.fileName, { type: "image/png" });
      await navigator.share({ files: [file], title: "My admission card" });
    } catch {
      /* cancelled */
    }
  };

  const closable = state.phase !== "preparing";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      onClick={closable ? onClose : undefined}
    >
      <div
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle on phones */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />
        {closable && (
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        )}

        {state.phase === "preparing" && (
          <div className="py-4 text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 rounded-full opacity-20" style={{ background: color }} />
              <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin" style={{ color }} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-stone-900">Downloading your card</h2>
            <p className="mt-1 text-sm text-stone-500">{STEPS[step]}</p>
            <div className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ background: color, width: `${25 + step * 22}%` }} />
            </div>
            <p className="mt-5 text-xs text-stone-400">This takes a few seconds. Please keep this page open.</p>
          </div>
        )}

        {state.phase === "ready" && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <CheckCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Your card is ready!</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {ios ? "Press and hold the card below, then tap “Save to Photos”." : "It should be in your downloads. You can also save it again below."}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.url} alt="Your admission card" className="mx-auto mt-4 max-h-[46vh] w-auto rounded-xl border border-stone-200 shadow-md" />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => triggerDownload(state.url, state.fileName)}
                className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-sm"
                style={{ background: color }}
              >
                <Download className="h-5 w-5" /> {ios ? "Open / Save" : "Download again"}
              </button>
              {canShare ? (
                <button onClick={share} className="flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-base font-bold" style={{ borderColor: color, color }}>
                  <Share2 className="h-5 w-5" /> Save to phone / Share
                </button>
              ) : (
                <button onClick={onClose} className="rounded-xl border border-stone-200 py-3.5 text-base font-semibold text-stone-700">Done</button>
              )}
            </div>
            <p className="mt-4 text-xs text-stone-400">Show this card (QR code) at the entrance. Don&apos;t share it with others.</p>
          </div>
        )}

        {state.phase === "error" && (
          <div className="py-4 text-center">
            <XCircle className="mx-auto h-14 w-14 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-stone-900">Download didn&apos;t work</h2>
            <p className="mt-1 text-sm text-stone-500">{state.message}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button onClick={onRetry} className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white" style={{ background: color }}>
                <RotateCw className="h-5 w-5" /> Try again
              </button>
              <button onClick={onClose} className="rounded-xl border border-stone-200 py-3.5 text-base font-semibold text-stone-700">Close</button>
            </div>
            <p className="mt-4 text-xs text-stone-400">Tip: check your internet connection, or try without a photo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
