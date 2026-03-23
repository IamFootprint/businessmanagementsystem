import type { AnyRole } from "@/src/lib/auth/roles";
import type { SidebarNavGroup, SidebarNavItem, NavIcon } from "@/app/components/WorkspaceSidebar";

export type AdminNavItem = SidebarNavItem & {
  requiresEdit?: boolean;
  platformOnly?: boolean;
};

type AdminNavSectionDefinition = {
  key: string;
  label: string;
  items: AdminNavItem[];
};

const ADMIN_NAV_SECTIONS: AdminNavSectionDefinition[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: "home", description: "Today, KPIs, quick actions, and recent activity." },
      { href: "/admin/bookings", label: "Bookings", icon: "clipboard", description: "Manage booking intake, amendments, and job flow." },
      { href: "/admin/calendar", label: "Calendar", icon: "calendar", description: "Review scheduled jobs and upcoming demand." },
      { href: "/admin/scheduling", label: "Scheduling", icon: "timeline", description: "Assign mechanics and manage slot policy.", requiresEdit: true }
    ]
  },
  {
    key: "setup",
    label: "Setup",
    items: [
      { href: "/admin/setup", label: "Setup", icon: "checklist", description: "First-run checklist and operating defaults.", requiresEdit: true },
      { href: "/admin/catalog", label: "Catalogue", icon: "wrench", description: "Services, bundles, and workshop menu.", requiresEdit: true },
      { href: "/admin/inventory", label: "Inventory", icon: "box", description: "Parts, consumables, and usage tracking.", requiresEdit: true },
      { href: "/admin/pricing", label: "Pricing", icon: "tag", description: "Rates, pricing rules, and packaged offers.", requiresEdit: true },
      { href: "/admin/availability", label: "Availability", icon: "clock", description: "Shop hours, blackout dates, and mechanic time.", requiresEdit: true },
      { href: "/admin/mechanics", label: "Mechanics", icon: "tool", description: "Invite, activate, and manage workshop staff.", requiresEdit: true },
      { href: "/admin/users", label: "Users", icon: "users", description: "Shop user accounts and access roles.", requiresEdit: true }
    ]
  },
  {
    key: "system",
    label: "System",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell", description: "Review outbound workflow notifications." },
      { href: "/admin/audit", label: "Audit", icon: "shield", description: "Trace booking, catalogue, and status changes." },
      { href: "/admin/settings", label: "Settings", icon: "settings", description: "Business details, theme, and support settings.", requiresEdit: true },
      { href: "/admin/settings/widget", label: "Widget", icon: "globe", description: "Booking widget embed code and customization.", requiresEdit: true },
      { href: "/admin/support", label: "Support", icon: "message", description: "Support handoff and internal notes.", requiresEdit: true }
    ]
  },
  {
    key: "platform",
    label: "Platform",
    items: [
      { href: "/admin/platform/shops", label: "Platform", icon: "globe", description: "Approve shops and review platform-level oversight.", platformOnly: true },
      { href: "/admin/platform/security", label: "Security", icon: "shield", description: "Configure inactivity timeout and session rules.", platformOnly: true },
      { href: "/admin/leads", label: "Leads", icon: "users", description: "Marketing leads from public forms and early-access signups.", platformOnly: true }
    ]
  }
];

export const ADMIN_HOME_QUICK_ACTIONS = [
  { href: "/admin/bookings/new", label: "Create booking", icon: "clipboard" as NavIcon, description: "Capture a new booking request." },
  { href: "/admin/catalog?create=1", label: "Add service", icon: "wrench" as NavIcon, description: "Add a new service item to the catalogue." },
  { href: "/admin/mechanics?create=1", label: "Invite mechanic", icon: "tool" as NavIcon, description: "Send an invite to a mechanic or operator." }
] as const;

export function getAdminNavGroups({
  role,
  canEdit
}: {
  role: AnyRole;
  canEdit: boolean;
}): SidebarNavGroup[] {
  return ADMIN_NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.platformOnly && role !== "PLATFORM_OWNER") return false;
        if (item.requiresEdit && !canEdit) return false;
        return true;
      })
    }))
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      key: section.key,
      label: section.label,
      items: section.items
    }));
}

export function flattenAdminNavGroups(groups: SidebarNavGroup[]): SidebarNavItem[] {
  return groups.flatMap((group) => group.items);
}
