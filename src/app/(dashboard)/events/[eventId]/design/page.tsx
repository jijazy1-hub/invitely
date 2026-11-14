// src/app/(dashboard)/events/[eventId]/design/page.tsx
// Card Designer: pick a layout and preset, change colours, fonts, wording,
// background photo and decorations, with a live preview of the real card.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Lock, Check, Loader2, ImagePlus, Trash2, Save, Sparkles, Crown, Download,
} from "lucide-react";
import {
  type CardDesign, type Layout, LAYOUTS, TITLE_FONTS, ORNAMENTS, FRAMES, DESIGN_PRESETS, COLOR_SWATCHES,
  defaultDesign, isPremiumDesign, coverBox, backgroundBoxFor,
} from "@/lib/card-design";

type Access = { premium: boolean; mode: "PAID" | "FREE" };

type PreparedPhoto = { dataUrl: string; width: number; height: number; focusX: number; focusY: number; foundFaces: boolean };

// Keeps the WHOLE photo (longest side ≤ 1600px) so each layout can trim it to its
// own shape. Finds faces where the browser supports it (Chrome on Android/Mac);
// otherwise aims at the upper third, where faces usually are.
async function prepareBackground(file: File): Promise<PreparedPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

    let focusX = 0.5, focusY = 0.33, foundFaces = false;
    const FD = (window as any).FaceDetector;
    if (FD) {
      try {
        const faces: { boundingBox: DOMRectReadOnly }[] = await new FD({ fastMode: true, maxDetectedFaces: 6 }).detect(canvas);
        if (faces.length) {
          const l = Math.min(...faces.map((f) => f.boundingBox.left));
          const r = Math.max(...faces.map((f) => f.boundingBox.right));
          const t = Math.min(...faces.map((f) => f.boundingBox.top));
          const b = Math.max(...faces.map((f) => f.boundingBox.bottom));
          focusX = (l + r) / 2 / width;
          // Aim slightly below the faces so heads aren't pressed against the top edge.
          focusY = Math.min(1, ((t + b) / 2 + (b - t) * 0.35) / height);
          foundFaces = true;
        }
      } catch {
        /* face detection unavailable; keep the default */
      }
    }

    let q = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", q);
    while (dataUrl.length > 1_100_000 && q > 0.4) {
      q -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", q);
    }
    return { dataUrl, width, height, focusX, focusY, foundFaces };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Drag the photo to choose what stays in view; zoom to trim closer. Shows the layout's exact shape. */
function PhotoFramer({ design, onChange }: { design: CardDesign; onChange: (p: Partial<CardDesign>) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const target = backgroundBoxFor(design.layout);
  const [boxW, setBoxW] = useState(300);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (!design.background) return null;
  const boxH = (boxW * target.h) / target.w;
  const fit = coverBox(design.backgroundWidth, design.backgroundHeight, boxW, boxH, design.focusX, design.focusY, design.zoom);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: design.focusX, fy: design.focusY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    // Dragging the photo right shows more of its left side, so the focus moves left.
    const fx = Math.min(1, Math.max(0, drag.current.fx - dx / fit.width));
    const fy = Math.min(1, Math.max(0, drag.current.fy - dy / fit.height));
    onChange({ focusX: Number(fx.toFixed(3)), focusY: Number(fy.toFixed(3)) });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium text-stone-600">
        Adjust photo <span className="font-normal text-stone-400">(drag to move · this box is the exact shape used on the card)</span>
      </p>
      <div
        ref={boxRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative w-full max-w-sm cursor-grab touch-none select-none overflow-hidden rounded-lg border border-stone-300 bg-stone-100 active:cursor-grabbing"
        style={{ height: boxH }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.background}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{ left: fit.left, top: fit.top, width: fit.width, height: fit.height }}
        />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/25" />)}
        </div>
      </div>
      <label className="block max-w-sm text-xs font-medium text-stone-600">
        Zoom: {Math.round(design.zoom * 100)}%
        <input type="range" min={100} max={300} value={Math.round(design.zoom * 100)} onChange={(e) => onChange({ zoom: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[#0A2810]" />
      </label>
      <button type="button" onClick={() => onChange({ focusX: 0.5, focusY: 0.33, zoom: 1 })} className="text-xs text-stone-500 underline hover:text-stone-800">Reset framing</button>
    </div>
  );
}

function Section({ title, children, locked }: { title: string; children: React.ReactNode; locked?: boolean }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        {title}
        {locked && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"><Crown className="h-3 w-3" /> Premium</span>}
      </h2>
      {children}
    </section>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-600">{label}</span>
        <label className="flex items-center gap-2 text-xs text-stone-500">
          <span className="font-mono">{value.toUpperCase()}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-stone-200 bg-white p-0.5" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`h-6 w-6 rounded-full border ${value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-[#0A2810] ring-offset-1" : "border-stone-200"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CardDesignerPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventInfo, setEventInfo] = useState<{ name: string; eventType: string } | null>(null);
  const [design, setDesign] = useState<CardDesign | null>(null);
  const [savedJson, setSavedJson] = useState<string>("");
  const [access, setAccess] = useState<Access>({ premium: false, mode: "PAID" });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string; upgrade?: boolean } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  // Load
  useEffect(() => {
    fetch(`/api/events/${eventId}/design`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Could not load the design.");
        setEventInfo({ name: d.event.name, eventType: d.event.eventType });
        setDesign(d.design);
        setSavedJson(JSON.stringify(d.design));
        setAccess(d.access);
      })
      .catch((e) => setLoadError(e.message));
  }, [eventId]);

  // Live preview (debounced)
  const refreshPreview = useCallback(async (d: CardDesign) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/card-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: d }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Preview failed.");
      }
      const blob = await res.blob();
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") setPreviewError(e?.message || "Preview failed.");
    } finally {
      if (abortRef.current === ctrl) setPreviewBusy(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!design) return;
    const t = setTimeout(() => refreshPreview(design), 650);
    return () => clearTimeout(t);
  }, [design, refreshPreview]);

  if (loadError) {
    return <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>;
  }
  if (!design || !eventInfo) {
    return <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  const set = (patch: Partial<CardDesign>) => { setDesign({ ...design, ...patch }); setSaveMsg(null); };
  const setColor = (key: keyof CardDesign["colors"], v: string) => set({ colors: { ...design.colors, [key]: v } });
  const premiumLocked = !access.premium;
  const isClassic = design.layout === "classic";
  const dirty = JSON.stringify(design) !== savedJson;
  const needsUpgrade = isPremiumDesign(design) && premiumLocked;

  const applyPreset = (id: string) => {
    if (id === "classic") {
      set({ layout: "classic" });
      return;
    }
    const p = DESIGN_PRESETS.find((x) => x.id === id);
    if (!p) return;
    set({ ...p.design, colors: { ...p.design.colors } });
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const p = await prepareBackground(file);
      set({
        background: p.dataUrl,
        backgroundWidth: p.width,
        backgroundHeight: p.height,
        focusX: p.focusX,
        focusY: p.focusY,
        zoom: 1,
        layout: isClassic ? "elegant" : design.layout,
      });
      setPhotoNote(p.foundFaces ? "Faces found: the photo is trimmed around them on every layout." : "Photo trimmed around the upper middle. Drag it below if faces are cut off.");
    } catch {
      setSaveMsg({ ok: false, text: "We couldn't read that photo. Please use a JPG or PNG." });
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/events/${eventId}/design`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg({ ok: false, text: data.error || "Couldn't save.", upgrade: !!data.upgrade });
        return;
      }
      setDesign(data.design);
      setSavedJson(JSON.stringify(data.design));
      setSaveMsg({ ok: true, text: "Saved. New and re-downloaded cards (and confirmation emails) now use this design." });
    } catch {
      setSaveMsg({ ok: false, text: "No connection. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10 disabled:opacity-50";
  const choiceCls = (active: boolean) =>
    `relative rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-[#0A2810] bg-[#0A2810]/5 font-semibold text-stone-900" : "border-stone-200 text-stone-700 hover:border-stone-300"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/events/${eventId}`} className="text-stone-400 hover:text-stone-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Sparkles className="h-5 w-5 text-[#B8860B]" /> Card Designer</h1>
          <p className="truncate text-sm text-stone-500">{eventInfo.name}</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : needsUpgrade ? <Lock className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {dirty ? "Save design" : "Saved"}
        </button>
      </div>

      {access.mode === "FREE" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">🎉 Premium designs are free for everyone right now.</div>
      )}
      {premiumLocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span><Crown className="mr-1 inline h-4 w-4" /> The Classic card is free. Premium layouts, photos, fonts and decorations need a paid plan. Try them in the preview.</span>
          <Link href="/billing" className="rounded-lg bg-[#0A2810] px-3 py-1.5 text-xs font-semibold text-white">See plans</Link>
        </div>
      )}
      {saveMsg && (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${saveMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          <span>{saveMsg.ok && <Check className="mr-1 inline h-4 w-4" />}{saveMsg.text}</span>
          {saveMsg.upgrade && <Link href="/billing" className="rounded-lg bg-[#0A2810] px-3 py-1.5 text-xs font-semibold text-white">Upgrade</Link>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Preview (first on mobile) */}
        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-4 space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm" style={{ aspectRatio: design.layout === "classic" ? "1080 / 1440" : "1080 / 1500" }}>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Card preview" className="h-full w-full object-contain" />
              )}
              {(previewBusy || !preview) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                  <Loader2 className="h-7 w-7 animate-spin text-stone-500" />
                </div>
              )}
            </div>
            {previewError && <p className="text-sm text-red-600">{previewError}</p>}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Preview with a sample guest</span>
              {preview && (
                <a href={preview} download="card-preview.png" className="inline-flex items-center gap-1 font-semibold text-stone-700 hover:underline"><Download className="h-3.5 w-3.5" /> Download preview</a>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <Section title="1. Start from a design">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => applyPreset("classic")} className={choiceCls(isClassic)}>
                <div className="flex gap-1 mb-1.5">
                  {[design.colors.primary, design.colors.accent, design.colors.paper].map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />)}
                </div>
                Classic <span className="block text-[11px] font-normal text-emerald-700">Free</span>
              </button>
              {DESIGN_PRESETS.map((p) => {
                const active = !isClassic && design.layout === p.design.layout && design.colors.primary === p.design.colors.primary && design.colors.paper === p.design.colors.paper;
                return (
                  <button key={p.id} type="button" onClick={() => applyPreset(p.id)} className={choiceCls(active)}>
                    {premiumLocked && <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-amber-600" />}
                    <div className="flex gap-1 mb-1.5">
                      {[p.design.colors.primary, p.design.colors.accent, p.design.colors.paper].map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />)}
                    </div>
                    {p.name}
                    <span className="block text-[11px] font-normal text-stone-500">{LAYOUTS.find((l) => l.key === p.design.layout)?.name}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="2. Layout">
            <div className="grid gap-2 sm:grid-cols-2">
              {LAYOUTS.map((l) => (
                <button key={l.key} type="button" onClick={() => set({ layout: l.key as Layout })} className={choiceCls(design.layout === l.key)}>
                  {l.premium && premiumLocked && <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-amber-600" />}
                  {l.name}
                  <span className="block text-[11px] font-normal text-stone-500">{l.description}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="3. Colours">
            <div className="space-y-4">
              <ColorRow label="Main colour (pills, code box, edges)" value={design.colors.primary} onChange={(v) => setColor("primary", v)} />
              <ColorRow label="Gold / accent (title, labels, ornaments)" value={design.colors.accent} onChange={(v) => setColor("accent", v)} />
              <ColorRow label="Card background" value={design.colors.paper} onChange={(v) => setColor("paper", v)} />
              {!isClassic && <ColorRow label="Text" value={design.colors.ink} onChange={(v) => setColor("ink", v)} />}
            </div>
          </Section>

          {isClassic ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
              Choose a premium layout above to unlock your own wording, fonts, a background photo, ornaments and photo frames.
            </div>
          ) : (
            <>
              <Section title="4. Wording" locked={premiumLocked}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-stone-600">Top line
                    <input className={inputCls} value={design.header} maxLength={48} onChange={(e) => set({ header: e.target.value })} placeholder="WELCOME TO OUR WEDDING" />
                  </label>
                  <label className="block text-xs font-medium text-stone-600">Main title (names)
                    <input className={inputCls} value={design.title} maxLength={48} onChange={(e) => set({ title: e.target.value })} placeholder={eventInfo.name} />
                  </label>
                  <label className="block text-xs font-medium text-stone-600">Subtitle
                    <input className={inputCls} value={design.subtitle} maxLength={48} onChange={(e) => set({ subtitle: e.target.value })} placeholder="GUEST CHECK-IN CARD" />
                  </label>
                  <label className="block text-xs font-medium text-stone-600">Bottom line
                    <input className={inputCls} value={design.footer} maxLength={70} onChange={(e) => set({ footer: e.target.value })} placeholder="PERSONAL ADMISSION CARD · NOT TRANSFERABLE" />
                  </label>
                </div>
                <p className="mt-2 text-xs text-stone-400">Leave the main title empty to use the event name. Clear a line to hide it.</p>
              </Section>

              <Section title="5. Title font" locked={premiumLocked}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TITLE_FONTS.map((f) => (
                    <button key={f.key} type="button" onClick={() => set({ titleFont: f.key })} className={choiceCls(design.titleFont === f.key)}>{f.name}</button>
                  ))}
                </div>
              </Section>

              <Section title="6. Background photo" locked={premiumLocked}>
                <div className="flex flex-wrap items-center gap-3">
                  {design.background && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={design.background} alt="" className="h-20 w-14 rounded-md border border-stone-200 object-cover" />
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515]">
                    {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {design.background ? "Change photo" : "Upload photo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" onChange={onPhoto} />
                  </label>
                  {design.background && (
                    <button type="button" onClick={() => { set({ background: null }); setPhotoNote(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-stone-400">E.g. a photo of the couple. Any shape works: it&apos;s trimmed automatically to fit each layout, and faded behind the text so everything stays readable.</p>
                {photoNote && design.background && <p className="mt-1 text-xs text-emerald-700">{photoNote}</p>}
                <PhotoFramer design={design} onChange={set} />
                {design.background && design.layout !== "modern" && (
                  <label className="mt-4 block text-xs font-medium text-stone-600">
                    Fade: {design.backgroundFade}% {design.backgroundFade < 50 && <span className="text-amber-700">(text may be hard to read)</span>}
                    <input type="range" min={0} max={90} value={design.backgroundFade} onChange={(e) => set({ backgroundFade: Number(e.target.value) })} className="mt-2 w-full accent-[#0A2810]" />
                  </label>
                )}
                {design.background && design.layout === "modern" && (
                  <label className="mt-4 block text-xs font-medium text-stone-600">
                    Banner shading: {design.backgroundFade}%
                    <input type="range" min={0} max={90} value={design.backgroundFade} onChange={(e) => set({ backgroundFade: Number(e.target.value) })} className="mt-2 w-full accent-[#0A2810]" />
                  </label>
                )}
              </Section>

              <Section title="7. Decoration" locked={premiumLocked}>
                <p className="mb-2 text-xs font-medium text-stone-600">Corners</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ORNAMENTS.map((o) => (
                    <button key={o.key} type="button" onClick={() => set({ ornament: o.key })} className={choiceCls(design.ornament === o.key)}>{o.name}</button>
                  ))}
                </div>
                <p className="mb-2 mt-4 text-xs font-medium text-stone-600">Guest photo frame</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FRAMES.map((f) => (
                    <button key={f.key} type="button" onClick={() => set({ frame: f.key })} className={choiceCls(design.frame === f.key)}>{f.name}</button>
                  ))}
                </div>
                {design.layout === "modern" && <p className="mt-2 text-xs text-stone-400">The Modern layout doesn&apos;t use corner decorations.</p>}
              </Section>

              <Section title="8. Show on card" locked={premiumLocked}>
                <div className="flex flex-wrap gap-4 text-sm text-stone-700">
                  {([["showVenue", "Venue"], ["showSeat", "Seat number"], ["showDressCode", "Dress code"]] as const).map(([k, label]) => (
                    <label key={k} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={design[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<CardDesign>)} className="h-4 w-4 accent-[#0A2810]" />
                      {label}
                    </label>
                  ))}
                </div>
              </Section>

              <button
                type="button"
                onClick={() => set({ ...defaultDesign(eventInfo.eventType), layout: design.layout, colors: design.colors, background: design.background, backgroundWidth: design.backgroundWidth, backgroundHeight: design.backgroundHeight, focusX: design.focusX, focusY: design.focusY, zoom: design.zoom })}
                className="text-xs text-stone-500 underline hover:text-stone-800"
              >
                Reset wording, fonts and decorations
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
