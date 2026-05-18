import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { DM_Serif_Display, Outfit, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
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

const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'BMS — Kgolaentle Holdings',
  description: 'Business Management System',
  icons: { icon: '/brand/kh-favicon-32.png', apple: '/brand/kh-apple-touch.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${outfit.variable} ${geistMono.variable}`}>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
