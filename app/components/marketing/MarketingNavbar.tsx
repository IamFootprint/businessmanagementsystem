"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled
          ? "rgba(26, 31, 46, 0.95)"
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(94, 231, 223, 0.1)" : "none",
      }}
    >
      <nav
        className="marketing-container"
        aria-label="Main navigation"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "72px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "white",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Image
            src="/cycledesk-logo.png"
            alt="CycleDesk"
            width={160}
            height={40}
            style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
          }}
          className="marketing-nav-desktop"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: pathname === link.href ? "var(--marketing-glow)" : "rgba(255,255,255,0.8)",
                fontWeight: 500,
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
          className="marketing-nav-desktop"
        >
          <Link
            href="/partner/signup"
            style={{
              height: "44px",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "white",
              background: "linear-gradient(135deg, var(--marketing-primary), var(--marketing-secondary))",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
          >
            Start free trial
          </Link>
          <Link
            href="/contact"
            style={{
              height: "44px",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "white",
              border: "1px solid rgba(94, 231, 223, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            Get in touch
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "0.625rem",
            minWidth: "44px",
            minHeight: "44px",
            display: "none",
            justifyContent: "center",
            alignItems: "center",
          }}
          className="marketing-nav-mobile-btn"
        >
          {menuOpen ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(26, 31, 46, 0.98)",
              borderTop: "1px solid rgba(94, 231, 223, 0.1)",
              overflow: "hidden",
            }}
            className="marketing-nav-mobile-menu"
          >
            <div
              className="marketing-container"
              style={{ padding: "1.5rem" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      color: pathname === link.href ? "var(--marketing-glow)" : "rgba(255,255,255,0.8)",
                      fontWeight: 500,
                      fontSize: "1rem",
                      textDecoration: "none",
                      padding: "0.75rem 0",
                      minHeight: "44px",
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <Link
                    href="/partner/signup"
                    className="marketing-btn-primary"
                    style={{ justifyContent: "center" }}
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/contact"
                    style={{
                      height: "48px",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: "white",
                      border: "1px solid rgba(94, 231, 223, 0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                    }}
                  >
                    Get in touch
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
