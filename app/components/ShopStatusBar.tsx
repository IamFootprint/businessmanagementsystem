interface ShopStatusBarProps {
  shopName: string;
  role: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  PLATFORM_OWNER: "Platform",
  SHOP_OWNER: "Admin",
  ADMIN: "Admin",
  MECHANIC: "Mechanic",
  CLIENT: "Customer",
};

export default function ShopStatusBar({ shopName, role }: ShopStatusBarProps) {
  const roleLabel = ROLE_DISPLAY[role] || role;
  return (
    <div className="shop-status-bar">
      <span className="shop-status-bar-name">{shopName}</span>
      <span className="shop-status-bar-role">{roleLabel}</span>
    </div>
  );
}
