'use client'
import { useState, useEffect } from 'react'

interface StatusBarProps {
  pendingCount?: number
  unmatchedReceipts?: number
}

function Divider() {
  return <span className="h-[12px] w-px bg-white/10 shrink-0" />
}

export function StatusBar({ pendingCount = 0, unmatchedReceipts = 0 }: StatusBarProps) {
  const [time, setTime] = useState<string | null>(null)
  const [syncAge, setSyncAge] = useState('just now')
  const [syncMinutes, setSyncMinutes] = useState(0)

  useEffect(() => {
    const formatTime = () => {
      const now = new Date()
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      return `${h}:${m}:${s}`
    }
    setTime(formatTime())
    const t = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setSyncMinutes(m => Math.min(m + 1, 99))
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (syncMinutes === 0) setSyncAge('just now')
    else if (syncMinutes === 1) setSyncAge('1m ago')
    else if (syncMinutes >= 99) setSyncAge('99m+ ago')
    else setSyncAge(`${syncMinutes}m ago`)
  }, [syncMinutes])

  const handleSync = () => {
    setSyncMinutes(0)
    setSyncAge('just now')
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 flex h-[26px] items-center overflow-hidden font-mono"
      style={{ backgroundColor: '#0B1220', letterSpacing: '0.02em' }}
    >
      {/* 1. Env */}
      <div className="flex items-center gap-1.5 px-3 h-full text-[10.5px] font-mono">
        <span className="rounded bg-[var(--color-accent-2)] px-1.5 py-px text-[9px] font-semibold text-[var(--color-accent-ink)]">PROD</span>
        <span style={{ color: '#8893AA' }}>v2.4.1</span>
        <span style={{ color: '#475569' }}>build 26.05.14-a8f3c1</span>
      </div>

      <Divider />

      {/* 2. Connection */}
      <div className="flex items-center gap-1.5 px-3 h-full text-[10.5px] font-mono">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)] animate-status-pulse" />
        <span style={{ color: '#8893AA' }}>Connected</span>
      </div>

      <Divider />

      {/* 3. Sync */}
      <button
        onClick={handleSync}
        className="flex items-center gap-1.5 px-3 h-full text-[10.5px] font-mono hover:bg-white/5 transition-colors"
        style={{ color: '#8893AA' }}
      >
        Synced {syncAge}
      </button>

      <Divider />

      {/* 4. Context */}
      <div className="flex items-center px-3 h-full text-[10.5px] font-mono" style={{ color: '#475569' }}>
        Standard Bank Main · FY2026
      </div>

      {/* 5. Spacer */}
      <div className="flex-1" />

      {/* 6. Pending */}
      {pendingCount > 0 && (
        <>
          <div className="flex items-center gap-1.5 px-3 h-full text-[10.5px] font-mono" style={{ color: '#8893AA' }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warn)]" />
            {pendingCount} pending
          </div>
          <Divider />
        </>
      )}

      {/* 7. Unmatched receipts */}
      {unmatchedReceipts > 0 && (
        <>
          <div className="flex items-center px-3 h-full text-[10.5px] font-mono" style={{ color: '#475569' }}>
            {unmatchedReceipts} receipts open
          </div>
          <Divider />
        </>
      )}

      {/* 8. Time */}
      <div className="flex items-center px-3 h-full text-[10.5px] font-mono" style={{ color: '#8893AA' }}>
        {time !== null ? `${time} SAST` : '--:--:-- SAST'}
      </div>

      <Divider />

      {/* 9. ⌘K */}
      <div className="flex items-center px-3 h-full text-[10.5px] font-mono" style={{ color: '#475569' }}>
        ⌘K
      </div>
    </div>
  )
}
