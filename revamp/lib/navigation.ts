import type { SidebarNavGroup } from "@/revamp/components/WorkspaceSidebar";

export const ADMIN_NAV_GROUPS: SidebarNavGroup[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: "home", description: "Today, KPIs, quick actions, and recent activity." },
      { href: "/admin/bookings", label: "Bookings", icon: "clipboard", description: "Manage booking intake, amendments, and job flow." },
      { href: "/admin/calendar", label: "Calendar", icon: "calendar", description: "Review scheduled jobs and upcoming demand." },
      { href: "/admin/scheduling", label: "Scheduling", icon: "timeline", description: "Assign mechanics and manage slot policy." },
    ],
  },
  {
    key: "setup",
    label: "Setup",
    items: [
      { href: "/admin/catalog", label: "Catalogue", icon: "wrench", description: "Services, bundles, and workshop menu." },
      { href: "/admin/inventory", label: "Inventory", icon: "box", description: "Parts, consumables, and usage tracking." },
      { href: "/admin/pricing", label: "Pricing", icon: "tag", description: "Rates, pricing rules, and packaged offers." },
      { href: "/admin/availability", label: "Availability", icon: "clock", description: "Shop hours, blackout dates, and mechanic time." },
      { href: "/admin/mechanics", label: "Mechanics", icon: "tool", description: "Invite, activate, and manage workshop staff." },
      { href: "/admin/users", label: "Users", icon: "users", description: "Shop user accounts and access roles." },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell", description: "Review outbound workflow notifications." },
      { href: "/admin/audit", label: "Audit", icon: "shield", description: "Trace booking, catalogue, and status changes." },
      { href: "/admin/settings", label: "Settings", icon: "settings", description: "Business details, theme, and support settings." },
      { href: "/admin/support", label: "Support", icon: "message", description: "Support handoff and internal notes." },
    ],
  },
];

export const MECH_NAV_GROUPS: SidebarNavGroup[] = [
  {
    key: "work",
    label: "Work",
    items: [
      { href: "/mech", label: "Today", icon: "home", description: "Today's assigned jobs." },
      { href: "/mech/schedule", label: "Schedule", icon: "calendar", description: "Upcoming job schedule." },
      { href: "/mech/bookings/new", label: "New Booking", icon: "clipboard", description: "Capture walk-in booking." },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { href: "/mech/profile", label: "Profile", icon: "users", description: "Your profile and settings." },
    ],
  },
];
