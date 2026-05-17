// src/app/page.tsx
import Link from "next/link";
import { CalendarDays, QrCode, Users, Zap, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F3]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-[#0A2810] flex items-center justify-center">
            <Zap className="h-4 w-4 text-[#D4A843]" />
          </div>
          <span className="font-bold text-[#0A2810] text-xl tracking-tight">Invitely</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign In</Link>
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0A2810]/10 px-4 py-2 mb-8">
          <Zap className="h-4 w-4 text-[#0A2810]" />
          <span className="text-sm font-medium text-[#0A2810]">The smartest event invitation platform</span>
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold text-[#0A2810] leading-tight mb-6">
          Beautiful invitations.<br />
          <span className="text-[#B8860B]">Zero hassle.</span>
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create stunning digital invitations for any event — weddings, birthdays, conferences, concerts, and more.
          Manage RSVPs, generate personalized admission cards, and check in guests with QR codes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A2810] px-8 py-4 text-base font-semibold text-white hover:bg-[#0f3515] transition-colors"
          >
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-8 py-4 text-base font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-6xl mx-auto">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              title: "Any Event Type",
              desc: "Weddings, birthdays, conferences, concerts, church programs, VIP parties, burials — one platform handles them all.",
            },
            {
              icon: Users,
              title: "Smart Guest Management",
              desc: "Import guests from CSV, Excel, or paste bulk text. Auto-detect duplicates, normalize phone numbers, and show import reports.",
            },
            {
              icon: QrCode,
              title: "QR Check-In",
              desc: "Generate personalized admission cards with QR codes. Scan at the venue for instant check-in with duplicate prevention.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white border border-stone-200 p-8">
              <div className="h-12 w-12 rounded-xl bg-[#0A2810]/10 flex items-center justify-center mb-5">
                <Icon className="h-6 w-6 text-[#0A2810]" />
              </div>
              <h3 className="font-bold text-stone-900 text-lg mb-3">{title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Event types */}
      <section className="px-4 py-16 bg-[#0A2810]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Made for every occasion</h2>
          <p className="text-white/60 mb-10">One platform. Infinite events.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "💍 Weddings", "🎂 Birthdays", "🎤 Conferences", "🎵 Concerts",
              "⛪ Church Programs", "📋 Seminars", "🥂 VIP Parties",
              "🕊️ Burials", "🍽️ Private Dinners"
            ].map((label) => (
              <span key={label} className="rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-medium text-white">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-4 py-20">
        <h2 className="text-3xl font-bold text-stone-900 mb-4">Ready to send your first invitation?</h2>
        <p className="text-stone-600 mb-8">Free to start. No credit card required.</p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0A2810] px-8 py-4 text-base font-semibold text-white hover:bg-[#0f3515] transition-colors"
        >
          Create Your First Event <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-stone-500">© 2024 Invitely. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-stone-500 hover:text-stone-700">Privacy</a>
            <a href="#" className="text-sm text-stone-500 hover:text-stone-700">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
