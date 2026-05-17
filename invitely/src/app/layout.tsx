// src/app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Invitely — Event Invitation Platform",
    template: "%s | Invitely",
  },
  description: "Create stunning digital invitations for weddings, birthdays, conferences, and more. Manage RSVPs, generate admission cards, and check in guests — all in one place.",
  keywords: ["invitation", "RSVP", "event", "wedding", "digital invite", "QR code"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
