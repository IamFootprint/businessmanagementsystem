import "./globals.css";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import Analytics from "./components/Analytics";
import { Toaster } from "@/components/ui/sonner";
import { ToastProvider } from "./components/ToastProvider";
import { DEFAULT_META_DESCRIPTION, DEFAULT_META_TITLE, DEFAULT_OG_IMAGE, DEFAULT_OG_TITLE, SITE_URL } from "@/lib/seo";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_META_TITLE,
    template: "%s | CycleDesk"
  },
  description: DEFAULT_META_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "CycleDesk",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_META_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "CycleDesk bike workshop software overview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_META_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE]
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION || undefined
  },
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome", url: "/android-chrome-512x512.png" }
    ]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`light ${dmSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = localStorage.getItem("cycledesk-theme");
              if (stored === "dark") {
                document.documentElement.classList.remove("light");
                document.documentElement.classList.add("dark");
              }
            } catch {}
          })();`}
        </Script>
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
        <Toaster richColors position="top-right" />
        {GA4_ID ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA4_ID}', { anonymize_ip: true });`}
            </Script>
          </>
        ) : null}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}
