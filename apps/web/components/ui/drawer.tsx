'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  width?: 480 | 880
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

// Fix 4: static width map so Tailwind JIT scanner finds both classes
const widthClass = { 480: 'w-[480px]', 880: 'w-[880px]' } as const

export function Drawer({ open, onClose, width = 480, title, description, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`

  // Fix 1: SSR guard — only render portal after hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Escape key handler
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Fix 2: focus-on-open + restore focus on close
  const previousFocusRef = useRef<Element | null>(null)
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      panelRef.current?.focus()
    } else {
      (previousFocusRef.current as HTMLElement | null)?.focus()
    }
  }, [open])

  // Fix 1 cont'd: guard against SSR crash and premature render
  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(11,18,32,.30)', backdropFilter: 'blur(2px)', animation: 'overlayIn 150ms ease forwards' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel — Fix 3: aria-labelledby / aria-describedby instead of aria-label */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...(description ? { 'aria-describedby': descId } : {})}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex flex-col h-full bg-[var(--color-panel)] shadow-[var(--shadow-lg)] animate-drawer-in',
          widthClass[width]
        )}
      >
        {/* Head */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            {/* Fix 3: id on title element */}
            <p id={titleId} className="text-[13.5px] font-semibold text-[var(--color-ink)]">{title}</p>
            {description && (
              <p id={descId} className="mt-0.5 text-[12px] text-[var(--color-ink-3)]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
