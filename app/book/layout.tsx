import type { ReactNode } from "react";
import { Suspense } from "react";
import { getRequestShopContext } from "@/lib/shop/requestContext";
import ShopThemeProvider from "./components/ShopThemeProvider";
import EmbedWrapper from "./EmbedWrapper";

export default async function BookLayout({ children }: { children: ReactNode }) {
  const shop = await getRequestShopContext();
  const themeTokens = shop?.themeTokens as Record<string, string> | undefined;
  const shopName = themeTokens?.shopName || shop?.name;
  const primaryColor = themeTokens?.primaryColor;

  return (
    <ShopThemeProvider shopName={shopName} primaryColor={primaryColor}>
      <Suspense>
        <EmbedWrapper>
          <div className="min-h-screen bg-background flex flex-col">
            {/* Sticky booking header — hidden when embedded via CSS */}
            <header className="cd-booking-header sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center px-4">
              <a href="/" className="flex items-center gap-2">
                <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-6" />
              </a>
            </header>

            {/* Booking content */}
            <main className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full">
              {children}
            </main>
          </div>
        </EmbedWrapper>
      </Suspense>
    </ShopThemeProvider>
  );
}
