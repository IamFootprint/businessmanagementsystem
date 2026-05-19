import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans-admin',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-admin',
})

export default function AdminSignInLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${jakarta.variable} ${geistMono.variable} min-h-screen bg-[#08080C] text-white antialiased`}
      style={{ fontFamily: 'var(--font-sans-admin), sans-serif' }}
    >
      {children}
    </div>
  )
}
