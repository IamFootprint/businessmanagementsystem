import appPackage from "@/package.json";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || appPackage.version;

export function WorkspaceFooter({ shopName }: { shopName?: string | null }) {
  const year = new Date().getFullYear();
  const resolvedShopName = shopName?.trim() || "CycleDesk Platform";

  return (
    <footer className="workspace-footer" role="contentinfo">
      <p className="workspace-footer-copy">© {year} CycleDesk. All rights reserved.</p>
      <p className="workspace-footer-links">Contact support | Privacy policy</p>
      <p className="workspace-footer-version">{resolvedShopName} | v{APP_VERSION}</p>
    </footer>
  );
}
