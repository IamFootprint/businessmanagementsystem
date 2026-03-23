import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service — CycleDesk",
  description: "CycleDesk terms of service. The rules governing your use of the platform.",
  path: "/terms",
});

const LAST_UPDATED = "January 2025";

export default function TermsPage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      <section style={{ padding: "5rem 0" }}>
        <div className="marketing-container" style={{ maxWidth: "52rem" }}>
          {/* Header */}
          <div style={{ marginBottom: "3rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.875rem",
                borderRadius: "9999px",
                background: "rgba(94, 231, 223, 0.1)",
                border: "1px solid rgba(94, 231, 223, 0.3)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--marketing-glow)",
                marginBottom: "1.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Legal
            </span>
            <h1
              style={{
                fontSize: "2.25rem",
                fontWeight: 700,
                color: "white",
                marginBottom: "0.75rem",
                lineHeight: 1.2,
              }}
            >
              Terms of Service
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2.5rem",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.8,
            }}
          >
            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                1. Acceptance of terms
              </h2>
              <p>
                By accessing or using the CycleDesk platform (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. These terms apply to all users, including workshop owners, mechanics, customers, and administrators.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                2. Description of service
              </h2>
              <p>
                CycleDesk provides a software platform for managing bicycle service workshop operations, including booking management, job card tracking, invoicing, and customer communication. The Platform is provided as a subscription service (Software as a Service).
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                3. Account registration
              </h2>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>You must provide accurate and complete information when registering an account.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must notify us immediately of any unauthorised access to your account.</li>
                <li>One account per person. Sharing account credentials is not permitted.</li>
                <li>You must be at least 18 years old to register an account.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                4. Subscription and payment
              </h2>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Subscription fees are billed monthly or annually in South African Rand (ZAR).</li>
                <li>All prices are exclusive of VAT unless stated otherwise.</li>
                <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
                <li>Refunds are not provided for partial months of service.</li>
                <li>We reserve the right to change subscription pricing with 30 days&apos; notice.</li>
                <li>Free trials are available for new accounts as stated on the pricing page.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                5. Acceptable use
              </h2>
              <p style={{ marginBottom: "1rem" }}>You agree not to:</p>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Use the Platform for any unlawful purpose or in violation of applicable laws.</li>
                <li>Attempt to reverse engineer, decompile, or access source code of the Platform.</li>
                <li>Upload malicious code, viruses, or harmful content.</li>
                <li>Attempt to gain unauthorised access to other accounts or systems.</li>
                <li>Use automated tools to scrape or extract data from the Platform without permission.</li>
                <li>Resell or sublicense access to the Platform without written consent.</li>
                <li>Impersonate any person or entity using the Platform.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                6. Data ownership
              </h2>
              <p>
                You retain ownership of all data you input into the Platform, including customer information, booking records, and job card data. By using the Platform, you grant CycleDesk a limited licence to process and store your data solely for the purpose of providing the service. You can export your data at any time from your account settings.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                7. Service availability
              </h2>
              <p>
                We aim to maintain high Platform availability but do not guarantee uninterrupted access. We may perform maintenance that temporarily affects availability, and will provide reasonable notice where possible. We are not liable for losses arising from temporary unavailability of the Platform.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                8. Limitation of liability
              </h2>
              <p>
                To the maximum extent permitted by law, CycleDesk&apos;s total liability to you for any claim arising from these terms or use of the Platform shall not exceed the amount you paid for the Platform in the 3 months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                9. Termination
              </h2>
              <p>
                Either party may terminate the subscription at any time. We may suspend or terminate your account if you breach these terms. On termination, you retain the right to export your data for 30 days. After 30 days, data may be permanently deleted.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                10. Governing law
              </h2>
              <p>
                These terms are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the exclusive jurisdiction of the South African courts.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                11. Changes to terms
              </h2>
              <p>
                We may update these terms from time to time. Registered users will be notified of material changes via email. Continued use of the Platform after changes take effect constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                12. Contact
              </h2>
              <p>
                For questions about these terms, contact us at{" "}
                <a href="mailto:legal@cycledesk.co.za" style={{ color: "var(--marketing-glow)" }}>
                  legal@cycledesk.co.za
                </a>{" "}
                or via the{" "}
                <a href="/contact" style={{ color: "var(--marketing-glow)" }}>
                  contact form
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
