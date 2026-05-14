import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Outfit } from 'next/font/google'
import './globals.css'

const dmSerifDisplay = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BMS — Kgolaentle Holdings',
  description: 'Business Management System',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BMS',
  },
  icons: {
    icon: '/brand/kh-favicon-32.png',
    apple: '/brand/kh-apple-touch.png',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#080C14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${outfit.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
