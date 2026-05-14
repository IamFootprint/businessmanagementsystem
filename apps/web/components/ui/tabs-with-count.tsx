'use client'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
  panelId?: string
}

interface TabsWithCountProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
}

export function TabsWithCount({ tabs, activeTab, onTabChange, className }: TabsWithCountProps) {
  return (
    <div className={cn('flex gap-0 border-b border-[var(--color-border)]', className)} role="tablist">
      {tabs.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={tab.panelId}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors outline-none',
              isActive
                ? 'text-[var(--color-accent)] after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-[var(--color-accent)]'
                : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span className={cn(
                'rounded-full px-1.5 py-px text-[10.5px] font-semibold font-mono tabular',
                isActive
                  ? 'bg-[var(--color-accent-2)] text-[var(--color-accent-ink)]'
                  : 'bg-[var(--color-panel-2)] text-[var(--color-ink-3)]'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
