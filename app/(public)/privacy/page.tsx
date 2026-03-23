import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy — CycleDesk",
  description: "CycleDesk privacy policy. How we collect, use, and protect your data.",
  path: "/privacy",
});

const LAST_UPDATED = "January 2025";

export default function PrivacyPage() {
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
              Privacy Policy
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
                1. Who we are
              </h2>
              <p>
                CycleDesk is a workshop management software platform operated from South Africa. We provide booking, job card, invoicing, and communication tools for bicycle mechanics and service shops. In this policy, &ldquo;CycleDesk&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refers to the CycleDesk platform and its operators.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                2. What data we collect
              </h2>
              <p style={{ marginBottom: "1rem" }}>We collect the following types of information:</p>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><strong style={{ color: "white" }}>Account data:</strong> Name, email address, phone number, and role when you register or are invited to the platform.</li>
                <li><strong style={{ color: "white" }}>Booking data:</strong> Service bookings, bike details, address, and scheduling information.</li>
                <li><strong style={{ color: "white" }}>Job card data:</strong> Work notes, parts used, service checklists, and photos captured during jobs.</li>
                <li><strong style={{ color: "white" }}>Payment data:</strong> Invoicing details and payment confirmation records. We do not store full card numbers.</li>
                <li><strong style={{ color: "white" }}>Usage data:</strong> Pages visited, actions taken, and session information for security and product improvement.</li>
                <li><strong style={{ color: "white" }}>Lead data:</strong> Name, email, business name, and message submitted via our contact form.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                3. How we use your data
              </h2>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>To provide, operate, and improve the CycleDesk platform</li>
                <li>To send booking confirmations, reminders, and service notifications</li>
                <li>To process payments and generate invoices</li>
                <li>To respond to enquiries and support requests</li>
                <li>To send product updates and announcements (you can opt out at any time)</li>
                <li>To comply with legal obligations and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                4. Data sharing
              </h2>
              <p>
                We do not sell your personal data. We share data only as necessary to operate the platform — for example, with payment processors, cloud infrastructure providers, and notification services (WhatsApp, email). All third-party providers are required to handle your data in accordance with applicable data protection law.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                5. Data retention
              </h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide services. Booking and job card data is retained for a minimum of 5 years for business record-keeping purposes. You may request deletion of your personal data subject to legal retention requirements.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                6. Your rights (POPIA)
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                Under the Protection of Personal Information Act (POPIA), you have the right to:
              </p>
              <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to the processing of your personal information</li>
                <li>Withdraw consent for marketing communications</li>
              </ul>
              <p style={{ marginTop: "1rem" }}>
                To exercise these rights, contact us at{" "}
                <a href="mailto:privacy@cycledesk.co.za" style={{ color: "var(--marketing-glow)" }}>
                  privacy@cycledesk.co.za
                </a>
                .
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                7. Cookies
              </h2>
              <p>
                CycleDesk uses cookies to maintain your login session and remember your preferences. We do not use third-party advertising cookies. You can disable cookies in your browser settings, but this may affect platform functionality.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                8. Security
              </h2>
              <p>
                We implement industry-standard security measures including HTTPS encryption, secure session management, and access controls. No system is completely secure, and we cannot guarantee the absolute security of your data.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                9. Changes to this policy
              </h2>
              <p>
                We may update this privacy policy from time to time. We will notify registered users of significant changes via email. Continued use of the platform after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.875rem" }}>
                10. Contact
              </h2>
              <p>
                For privacy-related enquiries, contact us at{" "}
                <a href="mailto:privacy@cycledesk.co.za" style={{ color: "var(--marketing-glow)" }}>
                  privacy@cycledesk.co.za
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
