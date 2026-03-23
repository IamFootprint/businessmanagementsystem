"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type WorkspaceNavIcon =
  | "home"
  | "globe"
  | "checklist"
  | "wrench"
  | "box"
  | "calendar"
  | "clock"
  | "timeline"
  | "tag"
  | "clipboard"
  | "users"
  | "tool"
  | "bell"
  | "message"
  | "shield"
  | "settings"
  | "profile"
  | "plusCalendar"
  | "bike";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: WorkspaceNavIcon;
  description?: string;
};

export type WorkspaceNavGroup = {
  key: string;
  label: string;
  items: WorkspaceNavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/app" || href === "/mech") return false;
  return pathname.startsWith(`${href}/`);
}

export function WorkspaceGlyph({ icon }: { icon: WorkspaceNavIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (icon) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c3 3 3 15 0 18" />
          <path d="M12 3c-3 3-3 15 0 18" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...common}>
          <path d="M9 6h10M9 12h10M9 18h10" />
          <path d="M4 6l1.5 1.5L7.5 5.5M4 12l1.5 1.5L7.5 11.5M4 18l1.5 1.5L7.5 17.5" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M20 7a4 4 0 01-5 3.9L7 19l-2 2-2-2 2-2 8-8A4 4 0 1120 7z" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M3 8l9-5 9 5-9 5-9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "timeline":
      return (
        <svg {...common}>
          <path d="M4 7h7M13 7h7M10 7a2 2 0 100-4 2 2 0 000 4z" />
          <path d="M4 17h11M17 17h3M15 17a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20 12l-8 8-9-9V3h8l9 9z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4.5h6v3H9z" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M4 19a5 5 0 0110 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.8 19a4 4 0 016.2 0" />
        </svg>
      );
    case "tool":
      return (
        <svg {...common}>
          <path d="M12 5l7 7-2 2-7-7z" />
          <path d="M5 12l7 7-2 2-7-7z" />
          <path d="M14 3l7 7" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M12 4a5 5 0 00-5 5v3.5L5 15h14l-2-2.5V9a5 5 0 00-5-5z" />
          <path d="M10 18a2 2 0 004 0" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4V5z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0114 0" />
        </svg>
      );
    case "plusCalendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18M12 13v6M9 16h6" />
        </svg>
      );
    case "bike":
      return (
        <svg {...common}>
          <circle cx="6" cy="17" r="3.5" />
          <circle cx="18" cy="17" r="3.5" />
          <path d="M6 17l5-8h4l3 8M10 12h5M13 9l-1.5-3" />
        </svg>
      );
  }
}

export function WorkspaceNav({
  items,
  groups,
  compact = false,
  onNavigate,
  ariaLabel = "Workspace Navigation"
}: {
  items?: WorkspaceNavItem[];
  groups?: WorkspaceNavGroup[];
  compact?: boolean;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const resolvedGroups: WorkspaceNavGroup[] =
    groups ||
    (items
      ? [
          {
            key: "default",
            label: "",
            items
          }
        ]
      : []);

  return (
    <nav className={["workspace-nav", compact ? "workspace-nav--compact" : ""].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {resolvedGroups.map((group) => (
        <div key={group.key} className="workspace-nav-group">
          {group.label ? <p className="workspace-nav-group-label">{group.label}</p> : null}
          <div className="workspace-nav-group-links">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="workspace-nav-link"
                  data-active={active ? "true" : "false"}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <span className="workspace-nav-icon">
                    <WorkspaceGlyph icon={item.icon} />
                  </span>
                  <span className="workspace-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
