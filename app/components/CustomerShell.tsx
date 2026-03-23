"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bike, Calendar, Bell, User } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface CustomerShellUser {
  name?: string | null;
}

const customerNav = [
  { icon: Home, label: "Home", path: "/app" },
  { icon: Bike, label: "My Bikes", path: "/app/bikes" },
  { icon: Calendar, label: "Bookings", path: "/app/bookings" },
  { icon: Bell, label: "Updates", path: "/app/notifications" },
  { icon: User, label: "Profile", path: "/app/profile" },
];

interface CustomerShellProps {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
  hideNav?: boolean;
  user?: CustomerShellUser;
}

export function CustomerShell({ children, title, headerRight, hideNav, user }: CustomerShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-6" />
          {title && (
            <h1 className="font-display font-bold text-foreground text-lg">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {user && (
            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
              {user.name || "Customer"}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full">{children}</main>

      {/* App version */}
      <div className="px-4 pb-1 text-right">
        <span className="text-[10px] text-muted-foreground/50">v0.1.0</span>
      </div>

      {/* Bottom nav */}
      {!hideNav && (
        <nav className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {customerNav.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path !== "/app" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
