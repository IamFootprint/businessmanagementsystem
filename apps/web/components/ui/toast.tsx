'use client'
import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  message: string
}

interface ToastContextValue {
  toast: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const toast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { id, message }])
    const t = setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400)
    timersRef.current.push(t)
  }, [])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} message={t.message} onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white animate-toast-in'
      )}
      style={{ backgroundColor: '#0B1220', boxShadow: 'var(--shadow-lg)' }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
