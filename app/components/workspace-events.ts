"use client";

export const ADMIN_DRAWER_TOGGLE_EVENT = "cycledesk:admin-nav-toggle";

export function openAdminDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_DRAWER_TOGGLE_EVENT));
}
