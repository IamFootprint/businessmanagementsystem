"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, ClipboardList, Calendar, Clock, Wrench, Box, Tag, Users,
  UserCog, Bell, Shield, Settings, MessageSquare, Globe, Lock,
  ChevronDown, ChevronsLeft, ChevronsRight, LogOut
} from "lucide-react";
import { cn } from "@/src/lib/utils";

export type NavIcon =
  "home" | "clipboard" | "calendar" | "timeline" | "checklist" |
  "wrench" | "box" | "tag" | "clock" | "tool" | "users" |
  "bell" | "shield" | "settings" | "message" | "globe" | "lock";

const iconMap: Record<NavIcon, React.ElementType> = {
  home: Home, clipboard: ClipboardList, calendar: Calendar, timeline: Clock,
  checklist: Settings, wrench: Wrench, box: Box, tag: Tag, clock: Clock,
  tool: UserCog, users: Users, bell: Bell, shield: Shield, settings: Settings,
  message: MessageSquare, globe: Globe, lock: Lock,
};

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  description?: string;
};

export type SidebarNavGroup = {
  key: string;
  label: string;
  items: SidebarNavItem[];
};

interface WorkspaceSidebarProps {
  groups: SidebarNavGroup[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkspaceSidebar({ groups, collapsed = false, onToggleCollapse }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-30 border-r flex flex-col transition-all duration-200 border-sidebar-border bg-[#314877]",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-sidebar-border shrink-0">
        <img
          src="/cycledesk-logo.png"
          alt="CycleDesk"
          className={cn("transition-all duration-200", collapsed ? "h-7" : "h-9")}
        />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groups.map((group) => (
          <div key={group.key} className="mb-2">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    !openGroups[group.key] && "-rotate-90"
                  )}
                />
              </button>
            )}
            {(collapsed || openGroups[group.key]) && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] || Home;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && item.href !== "/mech" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/logout"
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </Link>
      </div>
    </aside>
  );
}
