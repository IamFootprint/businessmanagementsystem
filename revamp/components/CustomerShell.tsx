import { NavLink, useLocation } from "react-router-dom";
import { Home, Bike, Calendar, Bell, User } from "lucide-react";
import { cn } from "@/revamp/lib/utils";
import logo from "@/revamp/assets/cycledesk-logo.png";
import { useEffect, useState } from "react";

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
}

type WhoAmI = {
  authenticated?: boolean;
  profile?: {
    name?: string | null;
    role?: string | null;
  };
};

function roleLabel(role?: string | null) {
  if (role === "PLATFORM_OWNER") return "Platform owner";
  if (role === "SHOP_OWNER") return "Shop owner";
  if (role === "MECHANIC") return "Mechanic";
  if (role === "CLIENT") return "Client";
  return "User";
}

export function CustomerShell({ children, title, headerRight, hideNav }: CustomerShellProps) {
  const location = useLocation();
  const [session, setSession] = useState<WhoAmI | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as WhoAmI;
        if (ignore) return;
        if (!res.ok || !data?.authenticated) {
          setSession(null);
          return;
        }
        setSession(data);
      } catch {
        if (!ignore) setSession(null);
      }
    }

    void loadSession();
    return () => {
      ignore = true;
    };
  }, []);

  const identityName = session?.profile?.name?.trim() || "Current user";
  const identityRole = roleLabel(session?.profile?.role);

  return (
    <div className="min-h-screen bg-background flex flex-col text-[14px] border-t-4 border-[#24114f]">
      {/* Top header */}
      <header className="sticky top-0 z-20 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logo.src} alt="CycleDesk" className="h-6" />
          {title && (
            <h1 className="font-semibold text-foreground text-[28px] leading-none">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session?.authenticated ? (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Logged in as</span>
              <span className="text-sm font-semibold text-foreground">{identityName}</span>
              <span className="text-xs text-muted-foreground">({identityRole})</span>
            </div>
          ) : null}
          {headerRight}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-4 max-w-3xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav (mobile) / Top tabs (desktop) */}
      {!hideNav && (
        <nav className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {customerNav.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== "/app" && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className={cn("text-[11px] font-medium", isActive && "font-bold")}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
