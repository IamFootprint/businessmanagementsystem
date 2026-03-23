import type { Metadata } from "next";
import FadeIn from "@/app/components/marketing/FadeIn";
import CTASection from "@/app/components/marketing/CTASection";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ — CycleDesk | Questions We Get Asked",
  description:
    "Answers to common questions about CycleDesk — setup, pricing, data safety, mobile mechanics, and more.",
  path: "/faq",
});

const FAQS = [
  {
    q: "Do customers need to download an app?",
    a: "No. The customer booking portal is a mobile-optimised web app. Customers book and track their bike via a browser link — no install required.",
  },
  {
    q: "Does it work for mobile mechanics or only fixed workshops?",
    a: "CycleDesk was built specifically for mobile mechanics. It handles travel fees, callout zones, route tracking, and on-site job management.",
  },
  {
    q: "What happens if I need to reschedule or cancel a booking?",
    a: "Admins and mechanics can reschedule or cancel bookings from the dashboard. Customers are notified automatically via WhatsApp or email.",
  },
  {
    q: "Can I customise my service catalogue and pricing?",
    a: "Yes. You control your service list, labour rates, callout fees, travel zones, and add-ons. Pricing is calculated automatically at checkout.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. We offer a 14-day free trial on Solo and Shop plans. No credit card required to start.",
  },
  {
    q: "How long does it take to get set up?",
    a: "Most mechanics are up and running in under 15 minutes. Add your services, set your hours, and you're ready to take bookings.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data is encrypted, backed up, and never sold. You own your customer information — always.",
  },
  {
    q: "What if I'm switching from spreadsheets or paper?",
    a: "That's exactly who we built this for. There's nothing to migrate — just start fresh and your history builds from day one.",
  },
];

export default function FAQPage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      {/* Hero */}
      <section className="gradient-hero marketing-section">
        <div className="marketing-container" style={{ textAlign: "center" }}>
          <FadeIn>
            <span className="marketing-badge" style={{ marginBottom: "1.5rem" }}>
              FAQ
            </span>
            <h1
              className="marketing-heading-xl"
              style={{ color: "white", marginBottom: "1.5rem" }}
            >
              Questions we get asked
            </h1>
            <p
              className="marketing-text-lg"
              style={{ color: "rgba(255,255,255,0.7)", maxWidth: "36rem", margin: "0 auto" }}
            >
              Everything you need to know about CycleDesk. Can&apos;t find what you&apos;re looking for? Get in touch and we&apos;ll help.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ list */}
      <section className="marketing-section">
        <div className="marketing-container" style={{ maxWidth: "56rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {FAQS.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.06}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                  }}
                >
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "white", marginBottom: "0.625rem" }}>
                    {faq.q}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{faq.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        headline="Still have questions?"
        text="We're happy to help. Reach out and we'll get back to you within a business day."
        primaryLabel="Get in touch"
        primaryHref="/contact"
        secondaryLabel="Start free trial"
        secondaryHref="/partner/signup"
      />
    </div>
  );
}
