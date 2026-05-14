'use client'
import { Search, ChevronRight } from 'lucide-react'

interface TopbarProps {
  pageTitle: string
  period?: { label: string; status: 'open' | 'locked' }
}

export function Topbar({ pageTitle, period }: TopbarProps) {
  return (
    <div
      className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[var(--color-border)] px-6"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 85%, white)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-[var(--color-ink-3)]">Kgolaentle Holdings</span>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--color-ink-4)]" />
        <span className="font-medium text-[var(--color-ink)]">{pageTitle}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Period chip */}
        <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[12.5px]">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: period?.status === 'locked' ? 'var(--color-neutral)' : 'var(--color-accent)' }}
          />
          <span className="font-medium text-[var(--color-ink)]">{period?.label ?? '—'}</span>
          <span className="text-[var(--color-ink-3)]">·</span>
          <span className="text-[var(--color-ink-2)]">{period?.status === 'locked' ? 'Locked' : 'Open'}</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-3)]" />
          <input
            type="search"
            readOnly
            aria-label="Search (coming soon)"
            placeholder={`Search ${pageTitle.toLowerCase()}…`}
            className="h-8 min-w-[240px] rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] pl-8 pr-12 text-[13px] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-1.5 py-px font-mono text-[10px] text-[var(--color-ink-3)]">
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  )
}
