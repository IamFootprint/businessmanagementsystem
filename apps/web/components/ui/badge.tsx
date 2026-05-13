import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]',
        secondary: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
        outline: 'border border-[var(--color-border)] text-[var(--color-foreground)]',
        success: '[background-color:color-mix(in_srgb,var(--color-success)_12%,white)] text-[var(--color-success)]',
        warning: '[background-color:color-mix(in_srgb,var(--color-warning)_12%,white)] text-[var(--color-warning)]',
        destructive: '[background-color:color-mix(in_srgb,var(--color-destructive)_12%,white)] text-[var(--color-destructive)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
