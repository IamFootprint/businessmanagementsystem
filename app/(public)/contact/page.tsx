import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import ContactForm from "./ContactForm";
import { Mail, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact CycleDesk | Get in touch or start your free trial",
  description: "Get in touch with the CycleDesk team. We'll respond quickly and help you get set up.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      <section className="gradient-hero marketing-section">
        <div className="marketing-container">
          <div style={{ maxWidth: "36rem", margin: "0 auto" }}>
            <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
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
                Get in touch
              </span>
              <h1 className="marketing-heading-lg" style={{ color: "white", marginBottom: "0.875rem" }}>
                Let&apos;s talk about your workshop
              </h1>
              <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                Whether you&apos;re ready to start a trial, want a personalised demo, or have questions about how CycleDesk fits your operation — we&apos;d love to hear from you.
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "1.25rem",
                padding: "2rem",
              }}
            >
              <ContactForm />
            </div>

            {/* Contact info */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Mail width={18} height={18} strokeWidth={1.5} color="var(--marketing-glow)" style={{ flexShrink: 0 }} />
                <span>hello@cycledesk.co.za</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <MapPin width={18} height={18} strokeWidth={1.5} color="var(--marketing-glow)" style={{ flexShrink: 0 }} />
                <span>Johannesburg, South Africa</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Clock width={18} height={18} strokeWidth={1.5} color="var(--marketing-glow)" style={{ flexShrink: 0 }} />
                <span>We respond within 1 business day</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
