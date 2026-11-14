// src/app/terms/page.tsx
// Short terms of use. Have them reviewed by a lawyer before launch.
import type { Metadata } from "next";
import { LegalPage, ContactLine } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="14 November 2026">
      <p>By creating an account or using Invitely you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.</p>

      <h2>Your account</h2>
      <p>You must be 18 or over and give accurate details. You are responsible for activity on your account and for keeping your sign-in secure.</p>

      <h2>Guest lists</h2>
      <p>
        You may only add people you are genuinely inviting, and you are responsible for having a lawful reason to share their names, phone
        numbers and emails with us. Don&apos;t use Invitely to send spam or to contact people who haven&apos;t been invited to your event.
      </p>

      <h2>Plans and payments</h2>
      <p>
        Paid plans last 30 days from payment and are not renewed automatically. Prices are shown in Naira before you pay. If a payment fails
        or you were charged in error, contact us with your payment reference and we will investigate. Refunds are at our discretion unless
        the law requires otherwise.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, hateful or misleading events or content.</li>
        <li>No attempts to access other organisers&apos; events or guests, or to disrupt the service.</li>
        <li>No reselling or copying the service without our written permission.</li>
      </ul>
      <p>We may suspend accounts that break these rules.</p>

      <h2>Availability</h2>
      <p>
        We work to keep Invitely running, but we can&apos;t guarantee it will always be available or error-free. Keep your own copy of
        important guest lists, and have a back-up check-in plan for large events.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, {site.companyName} is not liable for indirect losses, and our total liability is limited to the amount
        you paid us in the 3 months before the claim.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will change the date above when we do. These terms are governed by the laws of the Federal Republic of
        Nigeria. Questions: <ContactLine />.
      </p>
    </LegalPage>
  );
}
