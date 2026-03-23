import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import FadeIn from "@/app/components/marketing/FadeIn";
import CTASection from "@/app/components/marketing/CTASection";
import { buildPageMetadata } from "@/lib/seo";
import {
  CalendarDays,
  FolderOpen,
  CreditCard,
  Bell,
  BarChart3,
  MessageCircle,
  Mail,
  Calendar,
  Check,
} from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "Product — CycleDesk Workshop Management Features",
  description:
    "Explore every feature in CycleDesk: online booking portal, digital job cards, automated invoicing, mechanic management, and customer notifications.",
  path: "/product",
});

const ICON_LG = { width: 48, height: 48, strokeWidth: 1.2, color: "var(--marketing-glow)" } as const;

const FEATURE_SECTIONS: Array<{ tag: string; title: string; body: string; bullets: string[]; icon: ReactNode; reversed: boolean }> = [
  {
    tag: "Booking portal",
    title: "Online bookings that actually work",
    body: "Your customers book 24/7 from any device. They pick their bike, choose a service, select an available time slot, and confirm — without calling or sending WhatsApps. You get a structured booking with all the info you need to prepare.",
    bullets: [
      "Multi-step booking flow with service selection",
      "Real-time slot availability based on your schedule",
      "Callout zone detection and travel fee calculation",
      "Instant confirmation with booking summary",
      "Reschedule and cancel without admin overhead",
    ],
    icon: <CalendarDays {...ICON_LG} />,
    reversed: false,
  },
  {
    tag: "Job cards",
    title: "Digital job cards your mechanics will love",
    body: "Every booking turns into a structured job card. Mechanics move through a defined workflow: scheduled → en route → arrived → in progress → awaiting approval → completed. Every action is timestamped and logged.",
    bullets: [
      "Clear status progression with visual indicators",
      "Checklist items for each service type",
      "Parts tracking with cost and markup",
      "Customer approval workflow for extras",
      "Photo capture for before/after documentation",
      "Full audit trail on every job",
    ],
    icon: <FolderOpen {...ICON_LG} />,
    reversed: true,
  },
  {
    tag: "Pricing engine",
    title: "Quotes that build themselves",
    body: "CycleDesk calculates your quote automatically from your service catalogue. Service fees, callout fees, travel zones, after-hours rates, parts markup, platform fees — all applied consistently every time.",
    bullets: [
      "Service fee with configurable labour rates",
      "Callout and travel zone pricing rules",
      "After-hours and weekend surcharges",
      "Parts and consumables with markup",
      "Add-on services at booking or on-site",
      "Rounding rules and platform fee configuration",
    ],
    icon: <CreditCard {...ICON_LG} />,
    reversed: false,
  },
  {
    tag: "Notifications",
    title: "Customers stay informed automatically",
    body: "CycleDesk sends the right message at the right time. From booking confirmation to mechanic en route to job complete — your customers always know what's happening without you having to send a single WhatsApp.",
    bullets: [
      "Booking confirmed and reminder notifications",
      "Mechanic en route and arrival alerts",
      "Approval requests for additional charges",
      "Job completion and invoice delivery",
      "Rescheduling and cancellation notices",
    ],
    icon: <Bell {...ICON_LG} />,
    reversed: true,
  },
  {
    tag: "Admin dashboard",
    title: "Run your whole business from one screen",
    body: "The admin console gives you a bird's eye view of everything: bookings, mechanics, service catalogue, pricing rules, customer accounts, and workshop calendar. Everything is a few clicks away.",
    bullets: [
      "Calendar view with booking management",
      "Mechanic assignment and availability",
      "Service catalogue with pricing rules",
      "Customer accounts and bike history",
      "Audit logs for every system action",
      "Revenue and booking analytics",
    ],
    icon: <BarChart3 {...ICON_LG} />,
    reversed: false,
  },
];

const ICON_SM = { width: 28, height: 28, strokeWidth: 1.5, color: "var(--marketing-glow)" } as const;

const INTEGRATIONS: Array<{ name: string; icon: ReactNode; description: string }> = [
  { name: "WhatsApp", icon: <MessageCircle {...ICON_SM} />, description: "Send booking updates and notifications directly to WhatsApp" },
  { name: "Email", icon: <Mail {...ICON_SM} />, description: "Invoice delivery and booking confirmations via email" },
  { name: "Payment gateways", icon: <CreditCard {...ICON_SM} />, description: "Accept card payments at the time of booking or on completion" },
  { name: "Google Calendar", icon: <Calendar {...ICON_SM} />, description: "Sync your schedule with your personal calendar" },
];

export default function ProductPage() {
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
                The platform
              </span>
              <h1 className="marketing-heading-xl" style={{ color: "white", marginBottom: "1.5rem" }}>
                Every feature your workshop needs,{" "}
                <span className="gradient-text">nothing it doesn&apos;t</span>
              </h1>
              <p
                className="marketing-text-lg"
                style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2.5rem" }}
              >
                CycleDesk is purpose-built for bike mechanics and service shops in South Africa. We didn&apos;t start from generic workshop software — we built from the specific needs of SA mobile mechanics.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/partner/signup" className="marketing-btn-primary">
                  Start free trial
                </Link>
                <Link
                  href="/contact"
                  className="marketing-btn-secondary"
                  style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}
                >
                  Get in touch
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Feature sections */}
      {FEATURE_SECTIONS.map((section, i) => (
        <section
          key={section.tag}
          className="marketing-section"
          style={{
            background: i % 2 === 0 ? "transparent" : "rgba(74, 63, 107, 0.12)",
          }}
        >
          <div className="marketing-container">
            <div className="marketing-feature-grid">
              <FadeIn delay={0} direction={section.reversed ? "right" : "left"}>
                <div style={{ order: section.reversed ? 2 : 1 }}>
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
                    {section.tag}
                  </span>
                  <h2
                    className="marketing-heading-lg"
                    style={{ color: "white", marginBottom: "1rem" }}
                  >
                    {section.title}
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      lineHeight: 1.75,
                      marginBottom: "1.5rem",
                      fontSize: "1rem",
                    }}
                  >
                    {section.body}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.625rem",
                          fontSize: "0.9rem",
                          color: "rgba(255,255,255,0.75)",
                        }}
                      >
                        <Check width={14} height={14} strokeWidth={2.5} color="var(--marketing-glow)" style={{ flexShrink: 0, marginTop: 2 }} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>

              <FadeIn delay={0.15} direction={section.reversed ? "left" : "right"}>
                <div
                  style={{
                    order: section.reversed ? 1 : 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="shadow-glow"
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      aspectRatio: "1",
                      borderRadius: "1.25rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(94, 231, 223, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {section.icon}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      ))}

      {/* Integrations */}
      <section className="marketing-section">
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
                Integrations
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                Works with the tools you already use
              </h2>
            </div>
          </FadeIn>
          <div className="marketing-grid-4">
            {INTEGRATIONS.map((item, i) => (
              <FadeIn key={item.name} delay={i * 0.1}>
                <div
                  className="card-hover"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "0.75rem", background: "rgba(94, 231, 223, 0.08)", border: "1px solid rgba(94, 231, 223, 0.12)", margin: "0 auto 0.75rem" }}>{item.icon}</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "white", marginBottom: "0.5rem" }}>
                    {item.name}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        headline="See CycleDesk in action"
        text="Request a personalised demo and we'll walk you through the full platform in 20 minutes."
        primaryLabel="Start free trial"
        primaryHref="/partner/signup"
        secondaryLabel="View Pricing"
        secondaryHref="/pricing"
      />
    </div>
  );
}
