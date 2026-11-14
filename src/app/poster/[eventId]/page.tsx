// src/app/poster/[eventId]/page.tsx
// Printable A4 poster with the guest self check-in QR, for the venue entrance.
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { appUrl } from "@/lib/site";
import { PrintButton } from "@/components/events/print-button";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function PosterPage({ params }: { params: { eventId: string } }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // The event's organiser, or a platform admin.
  const isAdmin = !!(await getAdminContext().catch(() => null));
  const event = await prisma.event.findFirst({ where: isAdmin ? { id: params.eventId } : { id: params.eventId, userId } });
  if (!event) notFound();

  const url = `${appUrl()}/arrive/${event.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 900, color: { dark: "#000000", light: "#FFFFFF" } });
  const primary = /^#[0-9a-fA-F]{6}$/.test(event.primaryColor) ? event.primaryColor : "#0A2810";
  const gold = /^#[0-9a-fA-F]{6}$/.test(event.secondaryColor) ? event.secondaryColor : "#B8860B";

  return (
    <main className="min-h-screen bg-stone-200 print:bg-white flex flex-col items-center py-8 print:py-0">
      <style>{`@page { size: A4; margin: 0; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mb-6 flex gap-3">
        <PrintButton />
      </div>
      <div
        className="bg-white shadow-xl print:shadow-none flex flex-col items-center justify-between text-center"
        style={{ width: "210mm", height: "297mm", padding: "18mm", borderTop: `14mm solid ${primary}`, borderBottom: `6mm solid ${gold}` }}
      >
        <div>
          <p style={{ color: gold, letterSpacing: "0.4em", fontWeight: 700, fontSize: 16 }}>WELCOME TO</p>
          <h1 style={{ color: primary, fontSize: 44, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>{event.name}</h1>
        </div>
        <div className="flex flex-col items-center">
          <p style={{ fontSize: 30, fontWeight: 800, color: "#111" }}>Scan to check in</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Check-in QR code" style={{ width: "120mm", height: "120mm", marginTop: 16, border: `3mm solid ${primary}`, borderRadius: 12 }} />
        </div>
        <div style={{ fontSize: 17, color: "#333", lineHeight: 1.6 }}>
          <p><b>1.</b> Open your phone camera and point it at the code</p>
          <p><b>2.</b> Enter your check-in code (or your phone number and email)</p>
          <p><b>3.</b> Show the screen with your photo and name to an usher</p>
          <p style={{ marginTop: 14, fontSize: 13, color: "#777" }}>{url}</p>
        </div>
      </div>
    </main>
  );
}
