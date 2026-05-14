import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 h-[22px] text-[10.5px] font-semibold tracking-[.04em] uppercase',
  {
    variants: {
      variant: {
        'needs-review': 'bg-[var(--color-warn-bg)] text-[var(--color-warn)]',
        reviewed:       'bg-[var(--color-ok-bg)] text-[var(--color-ok)]',
        unclear:        'bg-[var(--color-bad-bg)] text-[var(--color-bad)]',
        locked:         'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]',
        open:           'bg-[var(--color-info-bg)] text-[var(--color-info)]',
        unmatched:      'bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]',
        matched:        'bg-[var(--color-ok-bg)] text-[var(--color-ok)]',
        stale:          'bg-[var(--color-bad-bg)] text-[var(--color-bad)]',
        suggested:      'bg-[var(--color-warn-bg)] text-[var(--color-warn)]',
      },
    },
    defaultVariants: { variant: 'needs-review' },
  }
)

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {}

export function StatusPill({ className, variant, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ variant }), className)} {...props}>
      <span className="w-[5px] h-[5px] rounded-full bg-current shrink-0" />
      {children}
    </span>
  )
}

const STATUS_MAP: Record<string, StatusPillProps['variant']> = {
  NEEDS_REVIEW: 'needs-review',
  REVIEWED:     'reviewed',
  UNCLEAR:      'unclear',
  LOCKED:       'locked',
  OPEN:         'open',
  UNMATCHED:    'unmatched',
  SUGGESTED:    'suggested',
  MATCHED:      'matched',
  STALE:        'stale',
}

export function statusToVariant(status: string): StatusPillProps['variant'] {
  return STATUS_MAP[status] ?? 'needs-review'
}

export function StatusPillFromStatus({ status, ...props }: Omit<StatusPillProps, 'variant'> & { status: string }) {
  return <StatusPill variant={statusToVariant(status)} {...props}>{status.replace(/_/g, ' ')}</StatusPill>
}
