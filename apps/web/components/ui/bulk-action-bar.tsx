'use client'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BulkActionBarProps {
  count: number
  onSetCategory?: () => void
  onApprove?: () => void
  onClose: () => void
  className?: string
  extraActions?: ReactNode
}

export function BulkActionBar({ count, onSetCategory, onApprove, onClose, className, extraActions }: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className={cn(
          'pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5 text-white',
          className
        )}
        style={{ backgroundColor: '#0B1220', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Count chip */}
        <span className="mx-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular"
          aria-label={`${count} items selected`}
          style={{ backgroundColor: 'var(--color-accent-2)', color: 'var(--color-accent-ink)' }}>
          {count}
        </span>
        <span className="mr-1 text-[12.5px] font-medium text-white/80">selected</span>

        {/* Divider */}
        <span className="mx-1 h-4 w-px bg-white/20" />

        {onSetCategory && (
          <button
            onClick={onSetCategory}
            className="rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors hover:bg-white/10"
          >
            Set category
          </button>
        )}
        {onApprove && (
          <button
            onClick={onApprove}
            className="rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors hover:bg-white/10"
          >
            Approve
          </button>
        )}
        {extraActions}

        {/* Divider */}
        <span className="mx-1 h-4 w-px bg-white/20" />

        <button
          onClick={onClose}
          className="rounded-full p-1.5 transition-colors hover:bg-white/10"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
