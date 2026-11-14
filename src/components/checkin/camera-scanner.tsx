// src/components/checkin/camera-scanner.tsx
// Scans admission-card QR codes with the phone/tablet camera (works on any modern
// mobile browser over HTTPS). Calls onCode once per card, with a short cool-down
// so the same card isn't scanned twice in a row.
"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";

export function CameraScanner({ onCode, paused }: { onCode: (code: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  pausedRef.current = paused;
  onCodeRef.current = onCode;

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
  };

  useEffect(() => stop, []);

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !pausedRef.current) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      // Scan a downscaled frame: fast enough on low-end phones.
      const scale = Math.min(1, 640 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        const text = found?.data?.trim().toUpperCase();
        const now = Date.now();
        if (text && (text !== lastRef.current.code || now - lastRef.current.at > 4000)) {
          lastRef.current = { code: text, at: now };
          if (navigator.vibrate) navigator.vibrate(80);
          onCodeRef.current(text);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the camera. Use Chrome or Safari, or type the code.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      setOn(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Camera blocked. Allow camera access in your browser settings, then try again.");
      stop();
    }
  };

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl bg-black ${on ? "" : "hidden"}`}>
        <video ref={videoRef} className="w-full max-h-[55vh] object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-3xl border-4 border-[#D4A843]/80" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <button
        type="button"
        onClick={on ? stop : start}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/25"
      >
        {on ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        {on ? "Stop camera" : "Scan with camera"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
