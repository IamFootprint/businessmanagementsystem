import { NavLink, useLocation } from "react-router-dom";
import {
  Home, ClipboardList, Calendar, Clock, Wrench, Box, Tag, Users,
  UserCog, Bell, Shield, Settings, MessageSquare, Globe, Lock, ChevronDown, ChevronsLeft, ChevronsRight } from
"lucide-react";
import { cn } from "@/revamp/lib/utils";
import logo from "@/revamp/assets/cycledesk-logo.png";
import { useState } from "react";

export type NavIcon =
"home" | "clipboard" | "calendar" | "timeline" | "checklist" |
"wrench" | "box" | "tag" | "clock" | "tool" | "users" |
"bell" | "shield" | "settings" | "message" | "globe" | "lock";

const iconMap: Record<NavIcon, React.ElementType> = {
  home: Home, clipboard: ClipboardList, calendar: Calendar, timeline: Clock,
  checklist: Settings, wrench: Wrench, box: Box, tag: Tag, clock: Clock,
  tool: UserCog, users: Users, bell: Bell, shield: Shield, settings: Settings,
  message: MessageSquare, globe: Globe, lock: Lock
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
  onNavigate?: () => void;
}

export function WorkspaceSidebar({ groups, collapsed = false, onToggleCollapse, onNavigate }: WorkspaceSidebarProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className={cn("fixed left-0 top-0 bottom-0 z-30 border-r flex flex-col transition-all duration-200 border-[#263b66] bg-[#3b5181] text-[#d5def4]",
    collapsed ? "w-16" : "w-[260px]"
    )}>
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-[#2a3f6c] shrink-0">
        <img src={logo.src} alt="CycleDesk" className={cn("transition-all duration-200", collapsed ? "h-6" : "h-8")} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-[#d5def4]/70 hover:text-[#eef3ff] hover:bg-[#2f4571] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groups.map((group) =>
        <div key={group.key} className="mb-2">
            {!collapsed &&
          <button
            onClick={() => toggleGroup(group.key)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#b7c6ea] hover:text-[#e8efff] transition-colors">
                {group.label}
                <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              !openGroups[group.key] && "-rotate-90"
            )} />
              </button>
          }
            {(collapsed || openGroups[group.key]) &&
          <div className="space-y-0.5">
                {group.items.map((item) => {
              const Icon = iconMap[item.icon] || Home;
              const isActive = location.pathname === item.href ||
              item.href !== "/admin" && location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-[15px] font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                    isActive ?
                    "bg-[#2f4572] text-[#f6f8ff]" :
                    "text-[#d5def4] hover:bg-[#314875] hover:text-[#f3f7ff]"
                  )}>
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>);
            })}
              </div>
          }
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2a3f6c] p-3">
        <NavLink
          to="/logout"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium text-[#c8d4f0] hover:text-[#f3f7ff] hover:bg-[#2f4572] transition-colors",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}>
          <Settings className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </NavLink>
      </div>
    </aside>);
}
