import type { ReactNode } from "react";
import MarketingNavbar from "@/app/components/marketing/MarketingNavbar";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <MarketingNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <MarketingFooter />
    </div>
  );
}
