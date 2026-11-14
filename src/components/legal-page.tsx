// src/components/legal-page.tsx
// Shared layout for /privacy and /terms.
import Link from "next/link";
import { site } from "@/lib/site";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-[#1A1A2E]">Invitely</Link>
          <Link href="/#support" className="text-sm font-medium text-stone-600 hover:text-stone-900">Support</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-7 text-stone-700 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_p]:mb-4 [&_a]:text-[#F05537] [&_a]:underline">
        <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">Last updated: {updated}</p>
        <div className="mt-8">{children}</div>
      </article>
      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} {site.companyName} ·{" "}
        <Link href="/privacy" className="hover:text-stone-800">Privacy</Link> ·{" "}
        <Link href="/terms" className="hover:text-stone-800">Terms</Link>
      </footer>
    </main>
  );
}

export function ContactLine() {
  if (site.supportEmail) {
    return <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  }
  return <Link href="/#support">our support page</Link>;
}
