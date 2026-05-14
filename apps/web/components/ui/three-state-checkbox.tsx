'use client'
import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ThreeStateCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'> {
  checked: boolean | 'indeterminate'
  onChange: (checked: boolean) => void
}

export const ThreeStateCheckbox = forwardRef<HTMLInputElement, ThreeStateCheckboxProps>(
  ({ checked, onChange, className, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLInputElement>(null)

    // Merge refs: call forwardedRef whenever localRef changes
    const setRefs = (el: HTMLInputElement | null) => {
      (localRef as React.MutableRefObject<HTMLInputElement | null>).current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el
      }
    }

    useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = checked === 'indeterminate'
        localRef.current.checked = checked === true
      }
    }, [checked])

    return (
      <input
        type="checkbox"
        ref={setRefs}
        className={cn('h-4 w-4 cursor-pointer rounded border-[var(--color-border)] accent-[var(--color-accent)]', className)}
        onChange={e => onChange(e.target.checked)}
        {...props}
      />
    )
  }
)
ThreeStateCheckbox.displayName = 'ThreeStateCheckbox'
