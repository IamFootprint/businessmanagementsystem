"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import type { AnyRole } from "@/src/lib/auth/roles";
import { event as trackEvent } from "@/lib/analytics/ga4";
import { useBreakpoint } from "./useBreakpoint";

type Shop = {
  whatsapp?: string | null;
};

type WhoAmI = {
  authenticated?: boolean;
  profile?: {
    name?: string;
    phone?: string;
    role?: AnyRole;
    status?: string;
    onboardingStatus?: string | null;
    shopId?: string | null;
    shopStatus?: string | null;
  };
};

function normalizeWhatsApp(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function roleLabel(role?: AnyRole) {
  switch (role) {
    case "PLATFORM_OWNER":
      return "Platform";
    case "SHOP_OWNER":
      return "Shop";
    case "MECHANIC":
      return "Mechanic";
    case "CLIENT":
      return "Client";
    default:
      return "Account";
  }
}

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

const iconBtnClass = "inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";
const menuLinkClass = "block w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left";
const menuClass = "absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg py-1 z-50";

export function HeaderActions() {
  const pathname = usePathname();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [session, setSession] = useState<WhoAmI | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthenticated = Boolean(session?.authenticated);

  const loadHeaderState = useCallback(async () => {
    try {
      const [shopRes, whoamiRes] = await Promise.all([
        fetch("/api/public/shop", { cache: "no-store", credentials: "include" }),
        fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" })
      ]);
      const data = (await shopRes.json()) as Shop;
      const whoami = (await whoamiRes.json().catch(() => ({}))) as WhoAmI;
      const number = normalizeWhatsApp(data.whatsapp);
      setWhatsappUrl(number ? `https://wa.me/${number}` : null);
      setSession(whoamiRes.ok && whoami?.authenticated ? whoami : null);
    } catch {
      setWhatsappUrl(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) return;
      await loadHeaderState();
    }

    function onAuthChanged() {
      if (!active) return;
      void loadHeaderState();
    }

    void load();
    window.addEventListener("focus", onAuthChanged);
    window.addEventListener("cd-auth-changed", onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("focus", onAuthChanged);
      window.removeEventListener("cd-auth-changed", onAuthChanged);
    };
  }, [pathname, loadHeaderState]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, isMobile, isTablet, isDesktop]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (!menuOpen) return;
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const dashboardHref = useMemo(
    () =>
      getRoleHomePath(session?.profile?.role, {
        phone: session?.profile?.phone,
        name: session?.profile?.name,
        shopId: session?.profile?.shopId,
        profileStatus: session?.profile?.status,
        onboardingStatus: session?.profile?.onboardingStatus,
        shopStatus: session?.profile?.shopStatus
      }),
    [session]
  );

  const firstName = session?.profile?.name?.trim().split(/\s+/)[0] || "Dashboard";
  const compactRole = roleLabel(session?.profile?.role);
  const showWhatsAppInMenu = Boolean(whatsappUrl && !isAdminRoute);

  if (isMobile) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className={iconBtnClass}
          aria-label="Open account menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <KebabIcon />
        </button>

        {menuOpen ? (
          <div className={menuClass} role="menu" aria-label="Header menu">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2.5 border-b border-border">
                  <strong className="block text-sm text-foreground">{firstName}</strong>
                  <span className="text-xs text-muted-foreground">{compactRole}</span>
                </div>
                <Link href={dashboardHref} className={menuLinkClass} role="menuitem">
                  Open dashboard
                </Link>
                <Link href="/logout" className={menuLinkClass} role="menuitem">
                  Logout
                </Link>
              </>
            ) : (
              <Link href="/login" className={menuLinkClass} role="menuitem">
                Login
              </Link>
            )}
            {showWhatsAppInMenu ? (
              <a
                href={whatsappUrl!}
                className={menuLinkClass}
                role="menuitem"
                onClick={() => trackEvent("whatsapp_click", { location: "header_menu" })}
              >
                WhatsApp support
              </a>
            ) : null}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="relative flex items-center gap-1" ref={menuRef}>
        {isAuthenticated ? (
          <Link href={dashboardHref} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors" aria-label="Dashboard">
            <span className="text-muted-foreground">{compactRole}</span>
            <strong>{firstName}</strong>
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-primary hover:underline" aria-label="Login">
            Login
          </Link>
        )}

        <button
          type="button"
          className={iconBtnClass}
          aria-label="Open account menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <KebabIcon />
        </button>

        {menuOpen ? (
          <div className={menuClass} role="menu" aria-label="Header menu">
            {isAuthenticated ? (
              <Link href="/logout" className={menuLinkClass} role="menuitem">
                Logout
              </Link>
            ) : null}
            {showWhatsAppInMenu ? (
              <a
                href={whatsappUrl!}
                className={menuLinkClass}
                role="menuitem"
                onClick={() => trackEvent("whatsapp_click", { location: "header_menu" })}
              >
                WhatsApp support
              </a>
            ) : null}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {isAuthenticated ? (
        <>
          <Link href={dashboardHref} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors" aria-label="Dashboard">
            <span className="text-muted-foreground">{compactRole}</span>
            <strong>{firstName}</strong>
          </Link>
          <Link href="/logout" className="text-sm font-medium text-muted-foreground hover:text-foreground ml-2" aria-label="Logout">
            Logout
          </Link>
        </>
      ) : (
        <Link href="/login" className="text-sm font-medium text-primary hover:underline" aria-label="Login">
          Login
        </Link>
      )}
      {showWhatsAppInMenu ? (
        <a
          href={whatsappUrl || undefined}
          className={iconBtnClass}
          aria-label="WhatsApp"
          title="WhatsApp"
          onClick={() => trackEvent("whatsapp_click", { location: "header" })}
        >
          <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            <path d="M19.11 17.46c-.29-.15-1.68-.83-1.94-.92-.26-.1-.45-.15-.64.15-.19.29-.73.92-.9 1.11-.17.19-.33.22-.62.07-.29-.15-1.24-.46-2.36-1.47-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.15-.64-1.55-.88-2.12-.23-.55-.46-.48-.64-.48h-.55c-.19 0-.5.07-.76.36-.26.29-.99.97-.99 2.36s1.02 2.74 1.17 2.93c.15.19 2.01 3.07 4.87 4.3.68.29 1.21.46 1.62.59.68.22 1.29.19 1.78.12.54-.08 1.68-.68 1.91-1.34.24-.66.24-1.23.17-1.34-.07-.12-.26-.19-.55-.33z" />
            <path d="M16.01 3.2c-7.05 0-12.8 5.73-12.8 12.78 0 2.25.59 4.44 1.71 6.37l-1.12 4.12 4.24-1.11a12.73 12.73 0 0 0 5.97 1.52h.01c7.05 0 12.8-5.73 12.8-12.78 0-3.4-1.33-6.6-3.73-9.01-2.4-2.4-5.6-3.72-9.08-3.89zm0 22.02h-.01c-1.9 0-3.77-.51-5.41-1.48l-.39-.23-2.52.66.67-2.46-.25-.4a10.34 10.34 0 0 1-1.6-5.54c0-5.74 4.68-10.41 10.44-10.41 2.79 0 5.41 1.08 7.38 3.05a10.37 10.37 0 0 1 3.06 7.38c0 5.74-4.68 10.41-10.37 10.43z" />
          </svg>
        </a>
      ) : null}
      <ThemeToggle />
    </div>
  );
}
