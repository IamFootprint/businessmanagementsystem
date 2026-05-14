'use client'
import { useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover } from './popover'

export interface Category {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME'
  color?: string
}

interface InlineCategoryPickerProps {
  value: string | null
  onChange: (id: string) => void
  categories: Category[]
  className?: string
}

export function InlineCategoryPicker({ value, onChange, categories, className }: InlineCategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const selected = categories.find(c => c.id === value)
  const expenses = categories.filter(c => c.type === 'EXPENSE')
  const income = categories.filter(c => c.type === 'INCOME')
  const hasRenderable = expenses.length > 0 || income.length > 0

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-0.5 text-[12px] transition-colors hover:bg-[var(--color-panel-2)]',
          !selected && 'italic text-[var(--color-ink-3)]',
          className
        )}
      >
        {selected ? (
          <>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color ?? 'var(--color-ink-3)' }} />
            <span className="font-medium text-[var(--color-ink)]">{selected.name}</span>
          </>
        ) : (
          <span>Set category&hellip;</span>
        )}
        <ChevronDown className="h-3 w-3 shrink-0 text-[var(--color-ink-3)]" />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={btnRef.current}
        className="top-full mt-1 w-[220px]"
      >
        {expenses.length > 0 && (
          <CategoryGroup
            label="Expense"
            items={expenses}
            selectedId={value}
            onSelect={id => { onChange(id); setOpen(false) }}
          />
        )}
        {income.length > 0 && (
          <CategoryGroup
            label="Income"
            items={income}
            selectedId={value}
            onSelect={id => { onChange(id); setOpen(false) }}
          />
        )}
        {!hasRenderable && (
          <p className="px-3 py-2 text-[12px] text-[var(--color-ink-3)]">No categories</p>
        )}
      </Popover>
    </div>
  )
}

function CategoryGroup({ label, items, selectedId, onSelect }: {
  label: string
  items: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">{label}</p>
      {items.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--color-panel-2)]"
        >
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? 'var(--color-ink-3)' }} />
          <span className="flex-1 text-[var(--color-ink)]">{cat.name}</span>
          {selectedId === cat.id && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />}
        </button>
      ))}
    </div>
  )
}
