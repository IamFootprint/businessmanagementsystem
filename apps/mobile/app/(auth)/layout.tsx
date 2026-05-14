import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)', paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      {children}
    </div>
  )
}
