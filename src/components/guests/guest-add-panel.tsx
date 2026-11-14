// src/components/guests/guest-add-panel.tsx
// Add guests to an event: type one in, paste a list, or upload a CSV/Excel file.
// Used on the event's Guest List page and on the sidebar "Guests" page.
"use client";

import { useState } from "react";
import { Upload, Plus, FileText, Loader2, Download, UserPlus, ClipboardList } from "lucide-react";
import { nameError, phoneError, emailError, PHONE_FORMAT_HINT, LINE_FORMAT_HINT } from "@/utils/phone";

type ImportReport = { imported: number; duplicates: number; invalid: number; errors: string[] };
type Tab = "manual" | "text" | "file";

const SAMPLE_CSV = "Name,Phone,Email\nAdaeze Okafor,08012345678,adaeze@gmail.com\nTunde Bakare,+2348031234567,\nChidi Eze,07031234567,\n";

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invitely-guest-list-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function GuestAddPanel({
  eventId,
  onChanged,
  defaultTab = "manual",
}: {
  eventId: string;
  onChanged?: () => void;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Manual entry
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean; email?: boolean }>({});
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Bulk
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const validate = (n = name, p = phone, e = email) => ({
    name: nameError(n) ?? undefined,
    phone: phoneError(p) ?? undefined,
    email: emailError(e) ?? undefined,
  });

  const toReport = (data: any): ImportReport =>
    data?.report
      ? { ...data.report, errors: data.report.errors?.length ? data.report.errors : data.error ? [data.error] : [] }
      : { imported: 0, duplicates: 0, invalid: 0, errors: [data?.error || "Import failed. Please try again."] };

  const addOne = async () => {
    const errs = validate();
    setTouched({ name: true, phone: true, email: true });
    setFieldErrors(errs);
    setManualSuccess(null);
    setManualError(null);
    if (errs.name || errs.phone || errs.email) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setManualSuccess(`${name.trim()} was added to the guest list.`);
        setName(""); setPhone(""); setEmail("");
        setTouched({}); setFieldErrors({});
        onChanged?.();
      } else {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          setTouched({ name: true, phone: true, email: true });
        }
        setManualError(data.fieldErrors ? null : data.error || "Could not add guest. Please try again.");
      }
    } catch {
      setManualError("No connection. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const importText = async () => {
    if (!bulkText.trim()) return;
    setImporting(true);
    setReport(null);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText }),
      });
      const r = toReport(await res.json().catch(() => ({})));
      setReport(r);
      if (r.imported > 0) {
        if (r.invalid === 0) setBulkText("");
        onChanged?.();
      }
    } catch {
      setReport({ imported: 0, duplicates: 0, invalid: 0, errors: ["No connection. Please try again."] });
    } finally {
      setImporting(false);
    }
  };

  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setReport(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/import`, { method: "POST", body: form });
      const r = toReport(await res.json().catch(() => ({})));
      setReport(r);
      if (r.imported > 0) onChanged?.();
    } catch {
      setReport({ imported: 0, duplicates: 0, invalid: 0, errors: ["No connection. Please try again."] });
    } finally {
      setImporting(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "manual", label: "Add one guest", icon: UserPlus },
    { key: "text", label: "Paste a list", icon: ClipboardList },
    { key: "file", label: "Upload file", icon: Upload },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setReport(null); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Add one ── */}
      {tab === "manual" && (
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); addOne(); }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: "name", label: "Full name *", value: name, set: setName, placeholder: "e.g. Adaeze Okafor", type: "text", hint: "Letters only" },
              { key: "phone", label: "Phone number *", value: phone, set: setPhone, placeholder: "e.g. 08012345678", type: "tel", hint: "11 digits, or +234…" },
              { key: "email", label: "Email (optional)", value: email, set: setEmail, placeholder: "e.g. adaeze@gmail.com", type: "email", hint: "name@example.com" },
            ] as const).map((f) => {
              const err = touched[f.key] ? fieldErrors[f.key] : undefined;
              return (
                <label key={f.key} className="block">
                  <span className="text-xs font-medium text-stone-600">{f.label}</span>
                  <input
                    value={f.value}
                    type={f.type === "email" ? "text" : f.type}
                    inputMode={f.key === "phone" ? "tel" : f.key === "email" ? "email" : undefined}
                    autoComplete="off"
                    onChange={(e) => {
                      f.set(e.target.value);
                      setManualSuccess(null);
                      if (touched[f.key]) {
                        const next = { name, phone, email, [f.key]: e.target.value };
                        setFieldErrors(validate(next.name, next.phone, next.email));
                      }
                    }}
                    onBlur={() => {
                      if (!f.value) return;
                      setTouched((t) => ({ ...t, [f.key]: true }));
                      setFieldErrors(validate());
                    }}
                    placeholder={f.placeholder}
                    aria-invalid={!!err}
                    className={`mt-1 w-full rounded-lg border bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 ${
                      err ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-stone-200 focus:border-[#0A2810] focus:ring-[#0A2810]/10"
                    }`}
                  />
                  {err ? (
                    <span className="mt-1 block text-xs text-red-600">{err}</span>
                  ) : (
                    <span className="mt-1 block text-xs text-stone-400">{f.hint}</span>
                  )}
                </label>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60 transition-colors"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Guest
          </button>
          {manualError && <p className="text-sm text-red-600">{manualError}</p>}
          {manualSuccess && <p className="text-sm text-emerald-700">✓ {manualSuccess} Add the next one, or close this panel.</p>}
        </form>
      )}

      {/* ── Paste ── */}
      {tab === "text" && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            One guest per line: <code className="bg-stone-100 px-1 rounded">Name, Phone</code>. You can add an email as a third item:{" "}
            <code className="bg-stone-100 px-1 rounded">Name, Phone, Email</code>. You can paste straight from Excel, Google Sheets or WhatsApp.
            <br />Phone: {PHONE_FORMAT_HINT}
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            placeholder={"Adaeze Okafor, 08012345678\nTunde Bakare, +2348031234567, tunde@gmail.com\nChidi Eze, 07031234567"}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-mono text-stone-900 outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={importText}
              disabled={importing || !bulkText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60 transition-colors"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Importing…" : "Import Guests"}
            </button>
            {bulkText.trim() && (
              <span className="text-xs text-stone-500">{bulkText.split(/\r?\n/).filter((l) => l.trim()).length} lines</span>
            )}
          </div>
        </div>
      )}

      {/* ── File ── */}
      {tab === "file" && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            Upload a <strong>.csv</strong>, <strong>.xlsx</strong> or <strong>.txt</strong> file. Column A: name, column B: phone,
            column C: email (optional). A heading row is fine. For a Word file, copy the list and use <b>Paste a list</b>.
          </p>
          <label className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${importing ? "border-stone-200 bg-stone-50 cursor-wait" : "border-stone-200 bg-stone-50 cursor-pointer hover:border-[#0A2810]/40"}`}>
            {importing ? <Loader2 className="h-8 w-8 animate-spin text-stone-400" /> : <FileText className="h-8 w-8 text-stone-400" />}
            <span className="text-sm font-semibold text-stone-700">{importing ? "Importing…" : "Click to choose a file"}</span>
            <span className="text-xs text-stone-400">CSV, XLSX or TXT</span>
            <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={importFile} className="sr-only" disabled={importing} />
          </label>
          <button type="button" onClick={downloadSample} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A2810] hover:underline">
            <Download className="h-3.5 w-3.5" /> Download a sample file to fill in
          </button>
        </div>
      )}

      {/* ── Import result ── */}
      {report && tab !== "manual" && (
        <div className={`rounded-lg border p-4 text-sm space-y-1 ${report.imported > 0 ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}>
          <p className="font-semibold text-stone-900">Import result</p>
          <p className={report.imported > 0 ? "text-emerald-700" : "text-stone-600"}>✓ {report.imported} {report.imported === 1 ? "guest" : "guests"} added</p>
          {report.duplicates > 0 && <p className="text-amber-700">⚠ {report.duplicates} skipped: already on the list (same phone number)</p>}
          {report.invalid > 0 && <p className="text-red-700">✗ {report.invalid} {report.invalid === 1 ? "line has" : "lines have"} a problem. Fix {report.invalid === 1 ? "it" : "them"} and import again:</p>}
          {report.errors?.map((m) => <p key={m} className="text-red-700 pl-3">• {m}</p>)}
          {(report.invalid > 0 || report.imported === 0) && (
            <p className="pt-2 text-xs text-stone-500">Correct format: <code className="bg-white px-1 rounded border border-stone-200">{LINE_FORMAT_HINT}</code></p>
          )}
        </div>
      )}
    </div>
  );
}
