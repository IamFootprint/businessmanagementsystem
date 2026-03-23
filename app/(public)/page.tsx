import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import FadeIn from "@/app/components/marketing/FadeIn";
import { buildPageMetadata } from "@/lib/seo";
import {
  Calendar,
  ClipboardList,
  Bike,
  CreditCard,
  Bell,
  BarChart3,
  Check,
  X,
} from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "CycleDesk — You Didn't Start Fixing Bikes to Chase Invoices",
  description:
    "CycleDesk gives mobile mechanics and bike workshops the tools to manage bookings, job cards, and invoicing — so you can focus on the craft. Start your free trial.",
  path: "/",
});

const ICON_STYLE = { width: 28, height: 28, strokeWidth: 1.5, color: "var(--marketing-glow)" } as const;

const STEPS = [
  {
    number: "01",
    title: "Your customer books in minutes",
    body: "They pick a service, choose a slot, and confirm — from their phone. No calls, no back-and-forth, no lost messages.",
  },
  {
    number: "02",
    title: "You work the job, not the paperwork",
    body: "From en-route to completion, every step is tracked. Parts, notes, approvals — logged as you go, not after the fact.",
  },
  {
    number: "03",
    title: "The invoice writes itself",
    body: "When the job's done, the invoice is ready. Accurate, professional, sent. You didn't lift a finger.",
  },
];

const FEATURES = [
  {
    icon: <Calendar {...ICON_STYLE} />,
    title: "Booking calendar",
    body: "No more double-bookings or 'I thought you said Tuesday.' Customers see your real availability and book themselves in.",
    screenshot: "/screenshots/admin-calendar.png",
  },
  {
    icon: <ClipboardList {...ICON_STYLE} />,
    title: "Job card workflow",
    body: "Every job has a checklist. Every part is logged. Every approval is on record. When a customer asks 'what did you do?' — you've got the answer.",
    screenshot: "/screenshots/mechanic-today.png",
  },
  {
    icon: <CreditCard {...ICON_STYLE} />,
    title: "Pricing engine",
    body: "Service fees, callout fees, travel zones, parts markup — calculated automatically. Quote in seconds, not minutes.",
    screenshot: "/screenshots/admin-pricing.png",
  },
  {
    icon: <Bell {...ICON_STYLE} />,
    title: "Customer notifications",
    body: "Your customer gets a WhatsApp when you're on your way, when the job's done, and when the invoice is ready. You didn't send a single message.",
  },
  {
    icon: <Bike {...ICON_STYLE} />,
    title: "Bike management",
    body: "Every customer's bike has a profile. Service history, specs, notes. When they come back, you already know their bike.",
    screenshot: "/screenshots/admin-catalog.png",
  },
  {
    icon: <BarChart3 {...ICON_STYLE} />,
    title: "Admin dashboard",
    body: "Your business at a glance. Who's doing what, what's earning, where to improve.",
    screenshot: "/screenshots/admin-dashboard.png",
  },
];

const WHO = [
  {
    tag: "Mobile mechanics",
    title: "Run a lean solo operation",
    body: "Manage your own calendar, route to customers, track job status, and invoice — without an admin assistant.",
  },
  {
    tag: "Small workshops",
    title: "Coordinate a small team",
    body: "Assign jobs to mechanics, manage your service catalogue, and keep the workshop schedule organised.",
  },
  {
    tag: "Growing shops",
    title: "Scale without chaos",
    body: "Add mechanics, expand your service area, track parts inventory, and maintain quality as you grow.",
  },
];

const BEFORE_TIMELINE = [
  { time: "6:45 AM", text: "You scroll through 23 WhatsApp messages trying to figure out who confirmed for today." },
  { time: "8:30 AM", text: "You arrive at a customer's house. They expected you yesterday. The booking was in a voice note you missed." },
  { time: "12:00 PM", text: "You need a part. You can't remember what you quoted. The price was in a text thread somewhere." },
  { time: "5:30 PM", text: "Three jobs done. Now you sit down to write invoices from memory and hope you haven't forgotten any extras." },
];

const AFTER_TIMELINE = [
  { time: "6:45 AM", text: "You open CycleDesk. Three jobs confirmed, addresses mapped, parts lists ready." },
  { time: "8:30 AM", text: "Customer got an automatic \"mechanic en route\" notification. They're waiting with the bike ready." },
  { time: "12:00 PM", text: "You add a part to the job card. The quote updates automatically. Customer approves on their phone." },
  { time: "5:30 PM", text: "Three jobs done. Three invoices already sent. You're heading home." },
];

const HERO_BEFORE = [
  "17 unread WhatsApps",
  "3 missed calls",
  "1 lost booking",
];

const HERO_AFTER = [
  "3 jobs confirmed",
  "Parts ready",
  "Invoices queued",
];

export default function HomePage() {
  return (
    <div style={{ background: "var(--marketing-navy)", color: "white", paddingTop: "72px" }}>
      {/* ── Section 1: WHY Hero ── */}
      <section className="gradient-hero marketing-section" style={{ paddingTop: "6rem", paddingBottom: "6rem" }}>
        <div className="marketing-container">
          <div className="marketing-hero-grid">
            <FadeIn>
              <div>
                <span className="marketing-badge" style={{ marginBottom: "1.5rem" }}>
                  Built for SA bike mechanics
                </span>
                <h1
                  className="marketing-heading-xl"
                  style={{ color: "white", marginBottom: "1.5rem" }}
                >
                  You didn&apos;t start fixing bikes to{" "}
                  <span className="gradient-text">chase invoices.</span>
                </h1>
                <p
                  className="marketing-text-lg"
                  style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2.5rem", maxWidth: "34rem" }}
                >
                  You started because you love the craft. The sound of a perfectly tuned derailleur. The look on a customer&apos;s face when their bike rides like new. CycleDesk handles the business side so you can get back to what you&apos;re actually good at.
                </p>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <Link href="/partner/signup" className="marketing-btn-primary">
                    Start free trial
                  </Link>
                  <a
                    href="#your-world"
                    className="marketing-btn-secondary"
                    style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    See how it works
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* Hero contrast card */}
            <FadeIn delay={0.2} direction="left">
              <div className="marketing-hero-contrast-card shadow-glow">
                <div className="contrast-before">
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ff6b6b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
                    Without CycleDesk
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {HERO_BEFORE.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "rgba(255,255,255,0.6)" }}>
                        <X width={14} height={14} strokeWidth={2.5} color="#ff6b6b" style={{ flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="contrast-after">
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--marketing-glow)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
                    With CycleDesk
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {HERO_AFTER.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "rgba(255,255,255,0.8)" }}>
                        <Check width={14} height={14} strokeWidth={2.5} color="var(--marketing-glow)" style={{ flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Section 2: The Belief (WHY) ── */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.15)" }}>
        <div className="marketing-container" style={{ textAlign: "center" }}>
          <FadeIn>
            <span className="marketing-badge" style={{ marginBottom: "1.5rem" }}>
              What we believe
            </span>
            <h2
              className="marketing-heading-lg"
              style={{ color: "white", maxWidth: "42rem", margin: "0 auto 2rem" }}
            >
              Every small service business deserves enterprise-grade tools.
            </h2>
            <div className="marketing-belief-text">
              <p style={{ marginBottom: "1.25rem" }}>
                Big workshops have reception staff, booking systems, and accounting software. Solo mechanics have WhatsApp and a notebook. That gap isn&apos;t about talent — it&apos;s about access. We&apos;re here to close it.
              </p>
              <p>
                CycleDesk exists because we believe the mechanic working out of a van in Sandton deserves the same operational backbone as a 10-bay workshop in Cape Town. Not a watered-down version. The real thing.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Section 3: "Your World" Narrative ── */}
      <section id="your-world" className="marketing-section">
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span className="marketing-badge" style={{ marginBottom: "1rem" }}>
                A day in your life
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                Same mechanic. Different morning.
              </h2>
            </div>
          </FadeIn>
          <div className="marketing-narrative-grid">
            {/* Without CycleDesk */}
            <FadeIn delay={0.1}>
              <div className="marketing-narrative-card marketing-narrative-card-before">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ff6b6b", marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Without CycleDesk
                </h3>
                <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {BEFORE_TIMELINE.map((item) => (
                    <li key={item.time} className="marketing-timeline-item">
                      <span className="marketing-timeline-time">{item.time}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ol>
                <p style={{ marginTop: "1.25rem", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                  Great work, but it doesn&apos;t feel like it. You&apos;re exhausted and you haven&apos;t even done the books.
                </p>
              </div>
            </FadeIn>

            {/* With CycleDesk */}
            <FadeIn delay={0.2}>
              <div className="marketing-narrative-card marketing-narrative-card-after">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--marketing-glow)", marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  With CycleDesk
                </h3>
                <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {AFTER_TIMELINE.map((item) => (
                    <li key={item.time} className="marketing-timeline-item">
                      <span className="marketing-timeline-time">{item.time}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ol>
                <p style={{ marginTop: "1.25rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--marketing-glow)", fontStyle: "italic" }}>
                  Same skills. Same hands. But now your business runs like you always knew it could.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Section 4: How it works ── */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.1)" }}>
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span className="marketing-badge" style={{ marginBottom: "1rem" }}>
                How it works
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                Three steps. Zero chaos.
              </h2>
            </div>
          </FadeIn>
          <div className="marketing-grid-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.15}>
                <div style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--marketing-primary), var(--marketing-secondary))",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "white",
                      marginBottom: "1.25rem",
                      boxShadow: "0 0 20px -5px var(--marketing-glow)",
                    }}
                  >
                    {step.number}
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white", marginBottom: "0.625rem" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.3}>
            <div style={{ marginTop: "3rem", maxWidth: "48rem", margin: "3rem auto 0" }}>
              <div
                className="shadow-glow-sm"
                style={{
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: "1px solid rgba(94, 231, 223, 0.12)",
                }}
              >
                <Image
                  src="/screenshots/booking-services.png"
                  alt="Customer booking flow — choose a service package"
                  width={960}
                  height={600}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                Your customers book online in minutes — no app download needed.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Section 5: Features as stories ── */}
      <section className="marketing-section">
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span className="marketing-badge" style={{ marginBottom: "1rem" }}>
                What you get
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                Tools that work the way you do
              </h2>
            </div>
          </FadeIn>
          <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: f.screenshot ? "1fr 1fr" : "1fr",
                    gap: "2rem",
                    alignItems: "center",
                    padding: "2.5rem 0",
                    borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}
                  className="marketing-feature-section"
                >
                  <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "0.625rem", background: "rgba(94, 231, 223, 0.08)", border: "1px solid rgba(94, 231, 223, 0.15)", flexShrink: 0 }}>
                        {f.icon}
                      </div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "white" }}>
                        {f.title}
                      </h3>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.75, paddingLeft: "3.5rem" }}>{f.body}</p>
                  </div>
                  {f.screenshot && (
                    <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
                      <div
                        className="shadow-glow-sm"
                        style={{
                          borderRadius: "0.75rem",
                          overflow: "hidden",
                          border: "1px solid rgba(94, 231, 223, 0.12)",
                        }}
                      >
                        <Image
                          src={f.screenshot}
                          alt={`${f.title} screenshot`}
                          width={640}
                          height={400}
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Who it's for ── */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.1)" }}>
        <div className="marketing-container">
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span className="marketing-badge" style={{ marginBottom: "1rem" }}>
                Who it&apos;s for
              </span>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                Built for every stage of your business
              </h2>
            </div>
          </FadeIn>
          <div className="marketing-grid-3">
            {WHO.map((w, i) => (
              <FadeIn key={w.tag} delay={i * 0.1}>
                <div
                  className="card-hover"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "1rem",
                    padding: "1.75rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.75rem",
                      borderRadius: "9999px",
                      background: "rgba(94, 231, 223, 0.1)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--marketing-glow)",
                      marginBottom: "1rem",
                    }}
                  >
                    {w.tag}
                  </span>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white", marginBottom: "0.625rem" }}>
                    {w.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{w.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder's Note + CTA ── */}
      <section className="marketing-section" style={{ background: "rgba(74, 63, 107, 0.15)" }}>
        <div className="marketing-container" style={{ maxWidth: "48rem" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2 className="marketing-heading-lg" style={{ color: "white" }}>
                A note from the team
              </h2>
            </div>
            <blockquote
              style={{
                textAlign: "center",
                padding: "3rem 2rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(94, 231, 223, 0.15)",
                borderRadius: "1.25rem",
                position: "relative",
                marginBottom: "2.5rem",
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
                  fontSize: "1.125rem",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.85)",
                  fontStyle: "italic",
                  marginBottom: "1.5rem",
                }}
              >
                &ldquo;We built CycleDesk because we saw something that didn&apos;t make sense. The most skilled mechanics we knew were running their businesses on tools that weren&apos;t built for them. WhatsApp is great for chatting — not for running a workshop.&rdquo;
              </p>
              <p
                style={{
                  fontSize: "1.125rem",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.85)",
                  fontStyle: "italic",
                  marginBottom: "1.5rem",
                }}
              >
                &ldquo;If you&apos;re a mechanic who&apos;s tired of the admin eating into your evenings, we built this for you. Try it. If it doesn&apos;t make your life easier in the first week, tell us — we want to know.&rdquo;
              </p>
              <footer style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <span style={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
                  — The CycleDesk Team
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
                  Johannesburg, South Africa
                </span>
              </footer>
            </blockquote>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/partner/signup" className="marketing-btn-primary">
                Start free trial
              </Link>
              <Link href="/contact" className="marketing-btn-secondary" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
                Get in touch
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
