import Link from "next/link";
import Image from "next/image";

const PRODUCT_LINKS = [
  { label: "Features", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const GET_STARTED_LINKS = [
  { label: "Start free trial", href: "/partner/signup" },
  { label: "Get in touch", href: "/contact" },
];

const headingStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.4)",
  marginBottom: "1rem",
};

const linkStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  transition: "color 0.2s",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
};

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p style={headingStyle}>{title}</p>
      <ul style={listStyle}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} style={linkStyle}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketingFooter() {
  return (
    <footer
      className="gradient-hero"
      style={{
        borderTop: "1px solid rgba(94, 231, 223, 0.1)",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      <div className="marketing-container" style={{ padding: "4rem 1.5rem 2rem" }}>
        {/* Top section */}
        <div className="marketing-footer-grid" style={{ display: "grid", gap: "3rem", marginBottom: "3rem" }}>
          {/* Brand column */}
          <div>
            <Link href="/" style={{ display: "inline-block", marginBottom: "0.75rem", textDecoration: "none" }}>
              <Image
                src="/cycledesk-logo.png"
                alt="CycleDesk"
                width={140}
                height={35}
                style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
              />
            </Link>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.7, maxWidth: "22rem" }}>
              Booking and job tracking for bike shops and mobile mechanics. Less admin, more riding.
            </p>
            <a
              href="mailto:info@cycledesk.co.za"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.75rem",
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              info@cycledesk.co.za
            </a>
          </div>

          {/* Product */}
          <FooterColumn title="Product" links={PRODUCT_LINKS} />

          {/* Company */}
          <FooterColumn title="Company" links={COMPANY_LINKS} />

          {/* Legal */}
          <FooterColumn title="Legal" links={LEGAL_LINKS} />

          {/* Get Started */}
          <FooterColumn title="Get Started" links={GET_STARTED_LINKS} />
        </div>

        {/* Bottom bar */}
        <div
          className="marketing-footer-bottom"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            &copy; {new Date().getFullYear()} CycleDesk. All rights reserved.
          </p>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            Built for bike service businesses in South Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
