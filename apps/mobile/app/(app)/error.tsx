'use client'
import { useEffect } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'

export default function MobileAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Auto-retry once after a short delay — handles the Cloudflare Worker
    // cold-start / Neon WebSocket hiccup that often resolves on the second request.
    const t = setTimeout(() => reset(), 1500)
    return () => clearTimeout(t)
  }, [reset])

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-warn) 14%, transparent)' }}
      >
        <AlertCircle size={28} style={{ color: 'var(--color-warn)' }} />
      </div>
      <div>
        <p className="text-[15px] font-medium" style={{ color: 'var(--color-ink)' }}>
          Couldn&apos;t load this page
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
          Retrying automatically…
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium active:opacity-60"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-accent)',
          border: '1px solid var(--color-border)',
        }}
      >
        <RotateCw size={13} />
        Try again
      </button>
      {error.digest && (
        <p className="text-[10px]" style={{ color: 'var(--color-ink-4)' }}>
          Ref: {error.digest}
        </p>
      )}
    </div>
  )
}
