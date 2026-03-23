"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openAdminDrawer } from "./workspace-events";
import { useBreakpoint } from "./useBreakpoint";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/start", label: "Start" }
];

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function currentContext(pathname: string) {
  if (pathname.startsWith("/admin")) return "Admin Console";
  if (pathname.startsWith("/mech")) return "Mechanic Workspace";
  if (pathname.startsWith("/app")) return "Client Workspace";
  return "";
}

export function ResponsiveAppNav() {
  const pathname = usePathname();
  const { isMobile, isTablet } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);
  const contextTitle = currentContext(pathname);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isMobile) {
    return (
      <div className="app-mobile-nav">
        <button
          type="button"
          className="app-mobile-menu-button"
          aria-label={isAdminRoute ? "Open admin navigation" : "Open navigation"}
          onClick={() => {
            if (isAdminRoute) {
              openAdminDrawer();
              return;
            }
            setMenuOpen((current) => !current);
          }}
        >
          <HamburgerIcon />
        </button>

        {menuOpen ? (
          <div className="app-mobile-menu-panel" role="dialog" aria-label="Primary navigation">
            {PUBLIC_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="app-mobile-menu-link">
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (contextTitle && isTablet) {
    return <span className="app-context-title">{contextTitle}</span>;
  }

  if (contextTitle && !isTablet) {
    return <span className="app-context-title app-context-title--desktop">{contextTitle}</span>;
  }

  return (
    <div className="app-nav-links">
      {PUBLIC_LINKS.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
