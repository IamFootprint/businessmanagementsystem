"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceNav, type WorkspaceNavGroup } from "@/app/components/WorkspaceNav";
import { ADMIN_DRAWER_TOGGLE_EVENT } from "@/app/components/workspace-events";
import { WorkspaceFooter } from "@/app/components/WorkspaceFooter";
import { useBreakpoint } from "@/app/components/useBreakpoint";

function roleLabel(role: string) {
  switch (role) {
    case "PLATFORM_OWNER":
      return "Platform";
    case "SHOP_OWNER":
      return "Shop owner";
    default:
      return role.replace(/_/g, " ").toLowerCase();
  }
}

export default function AdminResponsiveShell({
  groups,
  role,
  canEdit,
  reason,
  shopName,
  children
}: {
  groups: WorkspaceNavGroup[];
  role: string;
  canEdit: boolean;
  reason?: string;
  shopName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { isTablet } = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const summary = useMemo(
    () => ({
      label: roleLabel(role),
      secondary: canEdit ? "Full access" : "Read only"
    }),
    [canEdit, role]
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => setDrawerOpen((current) => !current);
    window.addEventListener(ADMIN_DRAWER_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(ADMIN_DRAWER_TOGGLE_EVENT, handleToggle);
  }, []);

  return (
    <div className="workspace-shell">
      <div className="workspace-frame workspace-frame--admin">
        <aside className="workspace-sidebar workspace-sidebar--admin" data-active-variant={process.env.NEXT_PUBLIC_SIDEBAR_ACTIVE_VARIANT || "balanced"}>
          <div className="workspace-sidebar-head">
            <div className="workspace-sidebar-title-row">
              <div>
                <h2>Admin Console</h2>
                <p>Operations, setup, and oversight</p>
              </div>
              <span className="workspace-role-badge">{summary.label}</span>
            </div>
            {reason ? <p className="workspace-sidebar-note">{reason}</p> : null}
          </div>
          <WorkspaceNav groups={groups} compact={isTablet} ariaLabel="Admin navigation" />
        </aside>

        <div
          className="workspace-drawer-backdrop"
          data-open={drawerOpen ? "true" : "false"}
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <aside
            className="workspace-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Admin navigation drawer"
          >
            <div className="workspace-drawer-head">
              <div>
                <strong>Admin Console</strong>
                <p>{summary.label}</p>
              </div>
              <button
                type="button"
                className="workspace-drawer-close"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            {reason ? <p className="workspace-sidebar-note">{reason}</p> : null}
            <WorkspaceNav groups={groups} onNavigate={() => setDrawerOpen(false)} ariaLabel="Admin mobile navigation" />
          </aside>
        </div>

        <main className="workspace-main workspace-main--admin">
          <div className="workspace-mobile-summary">
            <div>
              <span className="workspace-role-badge">{summary.label}</span>
              <p>{summary.secondary}</p>
            </div>
            <Link href="/admin/tools" className="workspace-mobile-tools-link">
              All tools
            </Link>
          </div>
          {children}
        </main>
      </div>
      <WorkspaceFooter shopName={shopName} />
    </div>
  );
}
