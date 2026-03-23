"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { WorkspaceSidebar, type SidebarNavGroup } from "./WorkspaceSidebar";
import ShopStatusBar from "./ShopStatusBar";
import { cn } from "@/src/lib/utils";

export interface ShellUser {
  name?: string | null;
  role: string;
}

interface WorkspaceShellProps {
  children: React.ReactNode;
  navGroups: SidebarNavGroup[];
  title?: string;
  headerRight?: React.ReactNode;
  user?: ShellUser;
  shopName?: string;
  shopRole?: string;
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_OWNER: "Platform",
  SHOP_OWNER: "Admin",
  MECHANIC: "Mechanic",
  CLIENT: "Customer",
};

export function WorkspaceShell({ children, navGroups, title, headerRight, user, shopName, shopRole }: WorkspaceShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {shopName ? <ShopStatusBar shopName={shopName} role={shopRole || ""} /> : null}
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <WorkspaceSidebar
          groups={navGroups}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-50 w-[280px] h-full">
            <WorkspaceSidebar groups={navGroups} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className={cn("transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-[260px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-6 lg:hidden" />
            {title && (
              <h1 className="font-display font-bold text-foreground text-lg hidden sm:block">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            {user && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {user.name || "User"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>

        {/* App version */}
        <footer className="px-4 lg:px-6 pb-3 text-right">
          <span className="text-[10px] text-muted-foreground/50">v0.1.0</span>
        </footer>
      </div>
    </div>
  );
}
