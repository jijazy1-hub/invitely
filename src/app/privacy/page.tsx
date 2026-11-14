// src/app/privacy/page.tsx
// Plain-language privacy policy. Have it reviewed by a lawyer before launch, and
// update it if you add new services or start storing new kinds of data.
import type { Metadata } from "next";
import { LegalPage, ContactLine } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const name = site.companyName;
  return (
    <LegalPage title="Privacy Policy" updated="14 November 2026">
      <p>
        This policy explains what personal data {name} (&quot;we&quot;, &quot;us&quot;) collects when you use Invitely, why, and the
        choices you have. We follow the Nigeria Data Protection Act 2023 (NDPA) and, where it applies, the EU/UK GDPR.
      </p>

      <h2>Who is responsible for your data</h2>
      <ul>
        <li><b>Organisers&apos; account data:</b> we decide how it is used, so we are the data controller.</li>
        <li>
          <b>Guest data</b> (names, phone numbers, emails and RSVPs on an event&apos;s guest list): the event organiser decides who to
          invite and uploads this data, so <b>the organiser is the controller</b> and we process it on their behalf. Guests with
          questions about why they were invited should contact the organiser first; we will help where we can.
        </li>
      </ul>

      <h2>What we collect</h2>
      <ul>
        <li><b>Organisers:</b> name, email address and profile picture (through our sign-in provider), event details you enter, logos or cover images you upload, and billing records (plan, amount, payment reference). We never see or store your card details.</li>
        <li><b>Guests:</b> the name and phone number the organiser adds; the email you give when you RSVP; your RSVP answer, seat number, check-in code and check-in time.</li>
        <li><b>Your photo:</b> if you add one, it is resized on your device and saved with your RSVP. It is used to draw your admission card and is shown at check-in (on your phone and on the door staff&apos;s scanner) so ushers can confirm it&apos;s you. The event organiser can also see it.</li>
        <li><b>Technical data:</b> IP address and basic request logs, used for security and to stop abuse (for example, limiting repeated attempts). Sign-in uses essential cookies; we do not use advertising cookies.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: create events, send invitation pages, record RSVPs, produce admission cards and check guests in.</li>
        <li>To email guests their admission card and check-in code after they confirm.</li>
        <li>To take payments and keep billing records, as required by law.</li>
        <li>To keep the service secure and to provide support when you contact us.</li>
      </ul>
      <p>
        Our legal bases are performance of a contract (running the service you or the organiser signed up for), legitimate interests
        (security and fraud prevention), legal obligation (financial records) and, where needed, consent. We do not sell personal data
        or use it for advertising.
      </p>

      <h2>Who we share it with</h2>
      <p>We use trusted service providers who process data only on our instructions:</p>
      <ul>
        <li>Clerk (sign-in and accounts)</li>
        <li>Supabase (database hosting)</li>
        <li>Vercel (website hosting)</li>
        <li>Cloudinary (logo and cover image storage)</li>
        <li>Resend (sending emails)</li>
        <li>Paystack and Flutterwave (payment processing)</li>
      </ul>
      <p>
        Some of these providers store data outside Nigeria. Where that happens we rely on their contractual safeguards, as the NDPA
        allows. Event organisers can see their own guests&apos; RSVP status, seat numbers and check-in times. We may disclose data if the
        law requires it.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Event and guest data, including photos: until the organiser deletes the event or their account. Deleting an event permanently deletes its guest list, RSVPs, photos and check-ins. Guests can ask us to delete their photo at any time.</li>
        <li>Billing records: up to 6 years, for tax and accounting.</li>
        <li>Security logs: a short period, then deleted.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete your personal data, object to or restrict how we use it, or ask for a copy in a portable
        format. Contact us at <ContactLine />. We reply within 30 days. If you are a guest, we may pass your request to the organiser of
        the event. You can also complain to the Nigeria Data Protection Commission (NDPC).
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (HTTPS). Access to guest lists is limited to the organiser who owns the event. Check-in codes are
        random and personal. Please don&apos;t share your code or admission card.
      </p>

      <h2>Children</h2>
      <p>Invitely is for organisers aged 18 or over. Organisers who add children to a guest list must have their parent&apos;s or guardian&apos;s permission.</p>

      <h2>Changes</h2>
      <p>We will update this page if our practices change and change the date above. For significant changes we will let organisers know by email.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: <ContactLine />.</p>
    </LegalPage>
  );
}
