import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'BMS — Kgolaentle Holdings',
  description: 'Business Management System',
  icons: { icon: '/brand/kh-favicon-32.png', apple: '/brand/kh-apple-touch.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
