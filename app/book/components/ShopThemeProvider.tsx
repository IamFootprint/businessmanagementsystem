"use client";

import type { ReactNode } from "react";

type ShopThemeProps = {
  shopName?: string;
  primaryColor?: string;
  children: ReactNode;
};

export default function ShopThemeProvider({ shopName, primaryColor, children }: ShopThemeProps) {
  const style = primaryColor
    ? ({ "--color-primary": primaryColor, "--color-primary-hover": primaryColor } as React.CSSProperties)
    : undefined;

  return (
    <div style={style}>
      {shopName ? (
        <div className="shop-brand-header" style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{shopName}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
