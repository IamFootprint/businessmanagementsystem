import type { Metadata } from "next";
import type { ReactNode } from "react";
import FadeIn from "@/app/components/marketing/FadeIn";
import CTASection from "@/app/components/marketing/CTASection";
import { buildPageMetadata } from "@/lib/seo";
import { Wrench, Globe, Smartphone, Rocket, Handshake, ShieldCheck } from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "About CycleDesk — We Believe Great Mechanics Deserve Great Tools",
  description:
    "CycleDesk was founded to solve the real operational problems facing mobile mechanics and service shops in South Africa. Our story, mission, and values.",
  path: "/about",
});

const ICON_STYLE = { width: 28, height: 28, strokeWidth: 1.5, color: "var(--marketing-glow)" } as const;

const VALUES: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <Wrench {...ICON_STYLE} />,
    title: "Built for mechanics, not accountants",
    body: "Every feature in CycleDesk was designed around how mechanics actually work — not how a software engineer imagined they might. We spent months with mobile mechanics before writing a line of code.",
  },
  {
    icon: <Globe {...ICON_STYLE} />,
    title: "Made for the South African market",
    body: "Pricing in ZAR, travel zones for SA suburbs, WhatsApp-first notifications, and an understanding of how township and suburban mobile mechanics operate differently.",
  },
  {
    icon: <Smartphone {...ICON_STYLE} />,
    title: "Mobile-first by necessity",
    body: "Most mechanics are on their phone while working. CycleDesk works beautifully on any mobile browser — no app install, no friction, no excuses.",
  },
  {
    icon: <Rocket {...ICON_STYLE} />,
    title: "Simple, not simplified",
    body: "We believe powerful software doesn't have to be complex. CycleDesk does exactly what you need without a week of training or a 100-page manual.",
  },
  {
    icon: <Handshake {...ICON_STYLE} />,
    title: "Partnership over product",
    body: "We're not just selling software. We're invested in helping your business grow. Every customer gets direct access to our founding team for feedback and support.",
  },
  {
    icon: <ShieldCheck {...ICON_STYLE} />,
    title: "Your data, your business",
    body: "We don't sell your data. We don't lock you in with proprietary formats. Your customer data, booking history, and business information is yours to keep.",
  },
];

export default function AboutPage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      {/* Hero */}
      <section className="gradient-hero marketing-section">
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", maxWidth: "52rem", margin: "0 auto" }}>
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
                Our story
              </span>
              <h1 className="marketing-heading-xl" style={{ color: "white", marginBottom: "1.5rem" }}>
                We believe great mechanics deserve{" "}
                <span className="gradient-text">great tools.</span>
              </h1>
              <p
                className="marketing-text-lg"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                CycleDesk started with a simple frustration: South Africa&apos;s mobile bike mechanics were running sophisticated businesses on WhatsApp threads and paper diaries. We knew there had to be a better way.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Founder quote */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.15)" }}>
        <div className="marketing-container" style={{ maxWidth: "48rem" }}>
          <FadeIn>
            <blockquote
              style={{
                textAlign: "center",
                padding: "3rem 2rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(94, 231, 223, 0.15)",
                borderRadius: "1.25rem",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-1px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "48px",
                  height: "2px",
                  background: "var(--marketing-glow)",
                  borderRadius: "1px",
                }}
              />
              <p
                style={{
                  fontSize: "1.25rem",
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.85)",
                  fontStyle: "italic",
                  marginBottom: "1.5rem",
                }}
              >
                &ldquo;I watched a brilliant mechanic lose a customer not because of his work — which was excellent — but because a booking fell through the cracks in a WhatsApp group. That shouldn&apos;t happen. CycleDesk exists so it doesn&apos;t.&rdquo;
              </p>
              <footer style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <span style={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
                  CycleDesk Founding Team
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
                  Johannesburg, South Africa
                </span>
              </footer>
            </blockquote>
          </FadeIn>
        </div>
      </section>

      {/* Mission */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-feature-grid">
            <FadeIn>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.875rem",
                    borderRadius: "9999px",
                    background: "rgba(94, 231, 223, 0.1)",
                    border: "1px solid rgba(94, 231, 223, 0.2)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--marketing-glow)",
                    marginBottom: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Our mission
                </span>
                <h2 className="marketing-heading-lg" style={{ color: "white", marginBottom: "1.25rem" }}>
                  Help SA mechanics run world-class operations
                </h2>
                <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
                  South Africa has some of the best bike mechanics in the world. The cycling culture here is growing rapidly — from mountain biking in the Cape to road cycling in Gauteng. The mechanics who keep those bikes running deserve better tools.
                </p>
                <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75 }}>
                  CycleDesk&apos;s mission is to give every South African bike mechanic — whether they&apos;re running solo from a van or managing a small workshop — the same professional operational foundation that established shops have. Not as a generic adaptation of a UK or US tool, but something built specifically for this market.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2} direction="left">
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(94, 231, 223, 0.12)",
                  borderRadius: "1.25rem",
                  padding: "2rem",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {[
                    { label: "Founded", value: "2024" },
                    { label: "Headquarters", value: "Johannesburg, SA" },
                    { label: "Focus market", value: "South Africa" },
                    { label: "Currency", value: "ZAR (South African Rand)" },
                    { label: "Stage", value: "Open Beta" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "1rem",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>{item.label}</span>
                      <span style={{ fontSize: "0.9rem", color: "white", fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Our WHY */}
      <section className="marketing-section">
        <div className="marketing-container" style={{ textAlign: "center" }}>
          <FadeIn>
            <span className="marketing-badge" style={{ marginBottom: "1.5rem" }}>
              Our why
            </span>
            <h2
              className="marketing-heading-lg"
              style={{ color: "white", maxWidth: "42rem", margin: "0 auto 2rem" }}
            >
              Every small service business deserves enterprise-grade tools.
            </h2>
            <p className="marketing-belief-text">
              The gap between a solo mechanic and a big workshop isn&apos;t talent — it&apos;s tooling. We&apos;re building the platform that closes that gap, starting with cycling in South Africa.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.12)" }}>
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.875rem",
                  borderRadius: "9999px",
                  background: "rgba(94, 231, 223, 0.1)",
                  border: "1px solid rgba(94, 231, 223, 0.2)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--marketing-glow)",
                  marginBottom: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Our values
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                What we believe
              </h2>
            </div>
          </FadeIn>
          <div className="marketing-grid-3">
            {VALUES.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.08}>
                <div
                  className="card-hover"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "1rem",
                    padding: "1.75rem",
                  }}
                >
                  <div style={{ marginBottom: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: "0.75rem", background: "rgba(94, 231, 223, 0.08)", border: "1px solid rgba(94, 231, 223, 0.15)" }}>{v.icon}</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "white", marginBottom: "0.625rem" }}>
                    {v.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{v.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        headline="Ready to run your workshop like a pro?"
        text="Start your free trial today. No credit card required."
        primaryLabel="Start free trial"
        primaryHref="/partner/signup"
        secondaryLabel="Get in touch"
        secondaryHref="/contact"
      />
    </div>
  );
}
