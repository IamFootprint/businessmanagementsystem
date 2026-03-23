import { useState } from "react";
import { useEffect } from "react";
import { Menu } from "lucide-react";
import { WorkspaceSidebar, type SidebarNavGroup } from "./WorkspaceSidebar";
import { cn } from "@/revamp/lib/utils";
import logo from "@/revamp/assets/cycledesk-logo.png";

interface WorkspaceShellProps {
  children: React.ReactNode;
  navGroups: SidebarNavGroup[];
  title?: string;
  headerRight?: React.ReactNode;
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

export function WorkspaceShell({ children, navGroups, title, headerRight }: WorkspaceShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
    <div className="min-h-screen bg-background text-[14px] border-t-4 border-[#24114f]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <WorkspaceSidebar groups={navGroups} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-50 w-[280px] h-full">
            <WorkspaceSidebar groups={navGroups} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className={cn("transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-[260px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <img src={logo.src} alt="CycleDesk" className="h-6 lg:hidden" />
            {title && <h1 className="font-semibold text-foreground text-[32px] leading-none hidden sm:block">{title}</h1>}
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

        {/* Page content */}
        <main className="p-4 lg:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
