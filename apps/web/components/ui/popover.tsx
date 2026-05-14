'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open: boolean
  onClose: () => void
  anchor: HTMLElement | null
  children: ReactNode
  className?: string
}

export function Popover({ open, onClose, anchor, children, className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchor && !anchor.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, anchor])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-40 min-w-[200px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] py-1',
        'shadow-[var(--shadow-lg)]',
        className
      )}
    >
      {children}
    </div>
  )
}
