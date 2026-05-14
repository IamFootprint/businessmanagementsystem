'use client'
import { useActionState, useRef, useState } from 'react'
import { Plus, Archive, X, Receipt as ReceiptIcon } from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import {
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
  type CategoryFormState,
} from './actions'

type Category = {
  id: string
  name: string
  categoryType: string
  receiptRequired: boolean
  active: boolean
}

type GroupedCategories = Record<string, Category[]>

const TYPE_LABELS: Record<string, string> = {
  REVENUE:  'Revenue',
  EXPENSE:  'Expense',
  TRANSFER: 'Transfer',
  OWNER:    'Owner',
  LOAN:     'Loan',
  TAX:      'Tax',
  UNKNOWN:  'Uncategorised',
}

const TYPE_COLORS: Record<string, string> = {
  REVENUE:  'var(--color-ok)',
  EXPENSE:  'var(--color-bad)',
  TRANSFER: 'var(--color-accent)',
  OWNER:    '#8B5CF6',
  LOAN:     '#06B6D4',
  TAX:      '#F59E0B',
  UNKNOWN:  'var(--color-ink-3)',
}

interface Props {
  grouped: GroupedCategories
}

export function CategoriesClient({ grouped }: Props) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<CategoryFormState, FormData>(
    async (prev, fd) => {
      const result = await createCategoryAction(prev, fd)
      if (result?.ok) {
        setShowForm(false)
        formRef.current?.reset()
        toast('Category created')
      }
      return result
    },
    null
  )

  async function handleArchive(id: string, name: string) {
    const result = await archiveCategoryAction(id)
    if (result.ok) {
      toast(`"${name}" archived`)
    } else {
      toast(`Archive failed: ${result.error ?? 'unknown error'}`)
    }
  }

  function startEdit(cat: Category) {
    setEditing(cat.id)
    setEditName(cat.name)
  }

  async function commitEdit(cat: Category) {
    if (editName.trim() === cat.name) {
      setEditing(null)
      return
    }
    const result = await updateCategoryAction(cat.id, { name: editName.trim() })
    if (result.ok) {
      toast('Renamed')
    } else {
      toast(`Rename failed: ${result.error ?? 'unknown error'}`)
    }
    setEditing(null)
  }

  async function toggleReceiptRequired(cat: Category) {
    await updateCategoryAction(cat.id, { receiptRequired: !cat.receiptRequired })
  }

  const allTypes = Object.keys(TYPE_LABELS)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-[26px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Categories
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            Classify transactions for reporting
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New category'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="mb-6 rounded-[10px] border p-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel)' }}
        >
          <p className="mb-4 text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
            New category
          </p>
          {state?.error && (
            <div
              className="mb-3 rounded-md px-3 py-2 text-[13px]"
              style={{
                backgroundColor: 'color-mix(in srgb,var(--color-bad) 10%,transparent)',
                color: 'var(--color-bad)',
              }}
            >
              {state.error}
            </div>
          )}
          <form
            ref={formRef}
            action={formAction}
            className="flex flex-wrap items-end gap-4"
          >
            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold uppercase tracking-[.06em]"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Name *
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Fuel & Oil"
                className="w-56 rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-panel-2)',
                  color: 'var(--color-ink)',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold uppercase tracking-[.06em]"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Type *
              </label>
              <select
                name="categoryType"
                required
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-panel-2)',
                  color: 'var(--color-ink)',
                }}
              >
                {allTypes.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input type="hidden" name="receiptRequired" value="false" />
              <input
                id="rcptReq"
                type="checkbox"
                name="receiptRequired"
                value="true"
                className="h-4 w-4 rounded"
              />
              <label htmlFor="rcptReq" className="text-[13px]" style={{ color: 'var(--color-ink)' }}>
                Receipt required
              </label>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Category groups */}
      <div className="flex flex-col gap-6">
        {allTypes.map(type => {
          const cats = grouped[type] ?? []
          if (cats.length === 0) return null
          return (
            <section key={type}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                />
                <p
                  className="text-[11px] font-semibold uppercase tracking-[.08em]"
                  style={{ color: TYPE_COLORS[type] }}
                >
                  {TYPE_LABELS[type]}
                </p>
                <span
                  className="rounded-full px-1.5 py-px text-[10px] font-mono"
                  style={{ backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink-3)' }}
                >
                  {cats.length}
                </span>
              </div>
              <div
                className="rounded-[10px] border overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {cats.map((cat, i) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                      backgroundColor: 'var(--color-panel)',
                    }}
                  >
                    {/* Name — click to edit inline */}
                    <div className="flex-1">
                      {editing === cat.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => commitEdit(cat)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(cat)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="rounded border px-2 py-1 text-[13px] font-medium focus:outline-none"
                          style={{
                            borderColor: 'var(--color-accent)',
                            backgroundColor: 'var(--color-panel-2)',
                            color: 'var(--color-ink)',
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-[13px] font-medium text-left hover:underline"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {cat.name}
                        </button>
                      )}
                    </div>

                    {/* Receipt required badge */}
                    <button
                      onClick={() => toggleReceiptRequired(cat)}
                      title={cat.receiptRequired ? 'Receipt required (click to toggle)' : 'Receipt not required (click to toggle)'}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
                      style={
                        cat.receiptRequired
                          ? { backgroundColor: 'color-mix(in srgb,var(--color-accent) 12%,transparent)', color: 'var(--color-accent)' }
                          : { backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink-3)' }
                      }
                    >
                      <ReceiptIcon className="h-3 w-3" />
                      {cat.receiptRequired ? 'Required' : 'Optional'}
                    </button>

                    {/* Archive button */}
                    <button
                      onClick={() => handleArchive(cat.id, cat.name)}
                      title="Archive category"
                      className="rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink-3)_12%,transparent)]"
                    >
                      <Archive className="h-3.5 w-3.5" style={{ color: 'var(--color-ink-3)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
