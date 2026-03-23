import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/app/components/marketing/FadeIn";
import CTASection from "@/app/components/marketing/CTASection";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing — CycleDesk Workshop Management Software",
  description:
    "CycleDesk pricing in South African Rand. Solo plan from R299/month. Shop plan from R699/month. Custom pricing for multi-location operations. 14-day free trial.",
  path: "/pricing",
});

const TIERS = [
  {
    name: "Solo",
    price: "R299",
    period: "/month",
    description: "For independent mobile mechanics running a solo operation.",
    features: [
      "1 mechanic account",
      "Up to 50 bookings per month",
      "Online booking portal",
      "Digital job cards",
      "Automated invoicing",
      "Customer notifications (WhatsApp + email)",
      "Service catalogue management",
      "Basic pricing rules",
      "Customer bike profiles",
      "14-day free trial",
    ],
    notIncluded: [
      "Multiple mechanics",
      "Team management",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/partner/signup",
    highlight: false,
  },
  {
    name: "Shop",
    price: "R699",
    period: "/month",
    description: "For small to medium workshops with a team of mechanics.",
    features: [
      "Up to 5 mechanic accounts",
      "Unlimited bookings",
      "Everything in Solo",
      "Team management and assignment",
      "Analytics and revenue dashboard",
      "Advanced pricing rules",
      "Multi-mechanic calendar",
      "Mechanic performance tracking",
      "Priority support",
      "14-day free trial",
    ],
    notIncluded: [
      "Multi-location support",
      "White-label option",
      "Custom integrations",
    ],
    cta: "Start free trial",
    href: "/partner/signup",
    highlight: true,
  },
  {
    name: "Custom",
    price: "Let's talk",
    period: "",
    description: "For multi-location operations, franchises, or businesses with unique requirements.",
    features: [
      "Unlimited mechanic accounts",
      "Multi-location support",
      "Everything in Shop",
      "White-label branding",
      "Custom integrations",
      "API access",
      "Dedicated account manager",
      "Custom onboarding",
      "SLA and uptime guarantee",
      "Quarterly business reviews",
    ],
    notIncluded: [],
    cta: "Get in touch",
    href: "/contact?form=demo",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — both Solo and Shop plans include a 14-day free trial. No credit card required to get started. You only pay when you decide to continue.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "What currency is pricing in?",
    a: "All pricing is in South African Rand (ZAR). There are no forex conversions, and your invoice will show VAT-exclusive pricing.",
  },
  {
    q: "Are there setup or onboarding fees?",
    a: "No setup fees on Solo or Shop plans. Custom plans may include a one-time onboarding fee depending on the complexity of your requirements.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept major credit and debit cards (Visa, Mastercard) and EFT payments. Monthly and annual billing available.",
  },
  {
    q: "What happens when I exceed the booking limit on Solo?",
    a: "We'll notify you before you hit the limit. You can upgrade to the Shop plan or purchase additional booking capacity as an add-on.",
  },
  {
    q: "Does the pricing include notification costs?",
    a: "Yes. WhatsApp and email notifications are included in all plans. There's no separate per-notification charge.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. There are no long-term contracts on Solo or Shop plans. You can cancel your subscription at any time from your account settings.",
  },
];

const COMPARISON_FEATURES = [
  { label: "Mechanic accounts", solo: "1", shop: "Up to 5", custom: "Unlimited" },
  { label: "Monthly bookings", solo: "50", shop: "Unlimited", custom: "Unlimited" },
  { label: "Online booking portal", solo: "✓", shop: "✓", custom: "✓" },
  { label: "Digital job cards", solo: "✓", shop: "✓", custom: "✓" },
  { label: "Automated invoicing", solo: "✓", shop: "✓", custom: "✓" },
  { label: "Customer notifications", solo: "✓", shop: "✓", custom: "✓" },
  { label: "Team management", solo: "—", shop: "✓", custom: "✓" },
  { label: "Analytics dashboard", solo: "—", shop: "✓", custom: "✓" },
  { label: "Multi-location", solo: "—", shop: "—", custom: "✓" },
  { label: "White-label branding", solo: "—", shop: "—", custom: "✓" },
  { label: "API access", solo: "—", shop: "—", custom: "✓" },
  { label: "Priority support", solo: "—", shop: "✓", custom: "✓" },
];

export default function PricingPage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      {/* Hero */}
      <section className="gradient-hero marketing-section">
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", maxWidth: "48rem", margin: "0 auto" }}>
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
                  marginBottom: "1.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Pricing
              </span>
              <h1 className="marketing-heading-xl" style={{ color: "white", marginBottom: "1rem" }}>
                Simple pricing,{" "}
                <span className="gradient-text">no surprises</span>
              </h1>
              <p
                className="marketing-text-lg"
                style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1rem" }}
              >
                All prices in South African Rand. No foreign currency fees. No hidden extras. Start free for 14 days.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-grid-3">
            {TIERS.map((tier, i) => (
              <FadeIn key={tier.name} delay={i * 0.1}>
                <div
                  style={{
                    background: tier.highlight
                      ? "linear-gradient(135deg, var(--marketing-primary), var(--marketing-secondary))"
                      : "rgba(255,255,255,0.03)",
                    border: tier.highlight
                      ? "1px solid rgba(94, 231, 223, 0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "1rem",
                    padding: "2rem",
                    boxShadow: tier.highlight ? "0 0 40px -10px var(--marketing-glow)" : "none",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  {tier.highlight && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--marketing-glow)",
                        color: "var(--marketing-navy)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.875rem",
                        borderRadius: "9999px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Most popular
                    </span>
                  )}
                  <div>
                    <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "white", marginBottom: "0.375rem" }}>
                      {tier.name}
                    </h2>
                    <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem" }}>
                      {tier.description}
                    </p>
                    <div style={{ marginBottom: "1.75rem" }}>
                      <span style={{ fontSize: "2.75rem", fontWeight: 700, color: "white" }}>{tier.price}</span>
                      {tier.period && (
                        <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginLeft: "0.25rem" }}>
                          {tier.period}
                        </span>
                      )}
                      {!tier.period && (
                        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem" }}>
                          Custom quote based on your needs
                        </p>
                      )}
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "0 0 1.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.625rem",
                      }}
                    >
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          <span style={{ color: "var(--marketing-glow)", flexShrink: 0, marginTop: "2px" }}>✓</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <Link
                      href={tier.href}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "0.875rem",
                        borderRadius: "0.5rem",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        textDecoration: "none",
                        background: tier.highlight ? "white" : "rgba(255,255,255,0.1)",
                        color: tier.highlight ? "var(--marketing-primary)" : "white",
                        border: tier.highlight ? "none" : "1px solid rgba(255,255,255,0.2)",
                        transition: "opacity 0.2s",
                      }}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.12)" }}>
        <div className="marketing-container">
          <FadeIn>
            <h2
              className="marketing-heading-lg"
              style={{ color: "white", textAlign: "center", marginBottom: "2.5rem" }}
            >
              Plan comparison
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div style={{ overflowX: "auto" }}>
              <table
                aria-label="Plan feature comparison"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      scope="col"
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 500,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        minWidth: "180px",
                      }}
                    >
                      Feature
                    </th>
                    {["Solo", "Shop", "Custom"].map((plan) => (
                      <th
                        key={plan}
                        scope="col"
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          color: "white",
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                          minWidth: "120px",
                        }}
                      >
                        {plan}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row, i) => (
                    <tr
                      key={row.label}
                      style={{
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          color: "rgba(255,255,255,0.75)",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        {row.label}
                      </td>
                      {[row.solo, row.shop, row.custom].map((val, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "0.875rem 1rem",
                            textAlign: "center",
                            color: val === "✓" ? "var(--marketing-glow)" : val === "—" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            fontWeight: val === "✓" || val === "—" ? 400 : 500,
                          }}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="marketing-section">
        <div className="marketing-container" style={{ maxWidth: "56rem" }}>
          <FadeIn>
            <h2
              className="marketing-heading-lg"
              style={{ color: "white", textAlign: "center", marginBottom: "2.5rem" }}
            >
              Pricing FAQ
            </h2>
          </FadeIn>
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
        headline="Start your free 14-day trial"
        text="No credit card required. Full access to all Solo features. Upgrade any time."
        primaryLabel="Start free trial"
        primaryHref="/partner/signup"
        secondaryLabel="Get in touch"
        secondaryHref="/contact"
      />
    </div>
  );
}
