import type { SidebarNavGroup } from "@/app/components/WorkspaceSidebar";

export const ADMIN_NAV_GROUPS: SidebarNavGroup[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: "home" },
      { href: "/admin/bookings", label: "Bookings", icon: "clipboard" },
      { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
      { href: "/admin/scheduling", label: "Scheduling", icon: "timeline" },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    items: [
      { href: "/admin/catalog", label: "Services", icon: "wrench" },
      { href: "/admin/inventory", label: "Inventory", icon: "box" },
      { href: "/admin/pricing", label: "Pricing", icon: "tag" },
    ],
  },
  {
    key: "team",
    label: "Team",
    items: [
      { href: "/admin/availability", label: "Availability", icon: "clock" },
      { href: "/admin/mechanics", label: "Mechanics", icon: "tool" },
      { href: "/admin/users", label: "Users", icon: "users" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/audit", label: "Audit", icon: "shield" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
      { href: "/admin/support", label: "Support", icon: "message" },
    ],
  },
];

export const MECH_NAV_GROUPS: SidebarNavGroup[] = [
  {
    key: "work",
    label: "Work",
    items: [
      { href: "/mech/today", label: "Today", icon: "home" },
      { href: "/mech/schedule", label: "Schedule", icon: "calendar" },
      { href: "/mech/bookings/new", label: "Add Booking", icon: "clipboard" },
      { href: "/mech/invite", label: "Invite Customer", icon: "users" },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { href: "/mech/profile", label: "Profile & Availability", icon: "settings" },
    ],
  },
];
