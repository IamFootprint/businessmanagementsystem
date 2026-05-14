'use client'
import { useActionState, useRef, useState, useTransition } from 'react'
import { Plus, Trash2, Play, X } from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { createRuleAction, deleteRuleAction, applyRulesAction } from './actions'
import type { RuleFormState } from './actions'

type Category = { id: string; name: string; categoryType: string }
type Supplier = { id: string; name: string }
type Rule = {
  id: string
  name: string
  descriptionPattern: string
  categoryId: string | null
  supplierId: string | null
  transactionType: string | null
  trustedAutoReview: boolean
  priority: number
  active: boolean
  category?: { name: string } | null
  supplier?: { name: string } | null
}

const TX_TYPES = [
  'REVENUE', 'EXPENSE', 'TRANSFER', 'OWNER_DRAW',
  'DIRECTOR_LOAN', 'REFUND', 'BANK_CHARGE', 'TAX', 'UNKNOWN',
]

interface Props {
  rules: Rule[]
  categories: Category[]
  suppliers: Supplier[]
}

export function RulesClient({ rules, categories, suppliers }: Props) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [applying, startApply] = useTransition()
  const [deleting, setDeleting] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<RuleFormState, FormData>(
    async (prev, fd) => {
      const result = await createRuleAction(prev, fd)
      if (result?.ok) {
        setShowForm(false)
        formRef.current?.reset()
        toast('Rule created')
      }
      return result
    },
    null
  )

  function handleApply() {
    startApply(async () => {
      const result = await applyRulesAction()
      if (result.error) {
        toast(`Apply failed: ${result.error}`)
      } else {
        toast(`Applied ${result.applied} matches`)
      }
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const result = await deleteRuleAction(id)
    setDeleting(null)
    if (result.ok) {
      toast('Rule disabled')
    } else {
      toast(`Delete failed: ${result.error ?? 'Unknown error'}`)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--color-ink)' }}>
            Rules
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            Auto-categorise transactions by description pattern
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleApply}
            disabled={applying || rules.length === 0}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-ok)', color: '#fff' }}
          >
            <Play className="h-4 w-4" />
            {applying ? 'Applying…' : 'Apply rules'}
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New rule'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="mb-6 rounded-[10px] border p-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel)' }}
        >
          <p className="mb-4 text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
            New rule
          </p>
          {state?.error && (
            <div
              className="mb-4 rounded-md px-3 py-2 text-[13px]"
              style={{ backgroundColor: 'color-mix(in srgb,var(--color-bad) 10%,transparent)', color: 'var(--color-bad)' }}
            >
              {state.error}
            </div>
          )}
          <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Rule name *
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Shell fuel"
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              />
            </div>
            {/* Pattern */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Description contains *
              </label>
              <input
                name="descriptionPattern"
                required
                placeholder="e.g. SHELL"
                className="rounded-md border px-3 py-2 font-mono text-[13px] uppercase focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              />
            </div>
            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Category
              </label>
              <select
                name="categoryId"
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              >
                <option value="">— none —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.categoryType})</option>
                ))}
              </select>
            </div>
            {/* Supplier */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Supplier
              </label>
              <select
                name="supplierId"
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              >
                <option value="">— none —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Transaction type */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Transaction type
              </label>
              <select
                name="transactionType"
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              >
                <option value="">— none —</option>
                {TX_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {/* Priority */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
                Priority (higher = runs first)
              </label>
              <input
                name="priority"
                type="number"
                defaultValue={0}
                className="rounded-md border px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink)' }}
              />
            </div>
            {/* Auto-review toggle */}
            <div className="flex items-center gap-2 pt-5">
              <input type="hidden" name="trustedAutoReview" value="false" />
              <input
                id="trustedAutoReview"
                type="checkbox"
                name="trustedAutoReview"
                value="true"
                className="h-4 w-4 rounded"
              />
              <label htmlFor="trustedAutoReview" className="text-[13px]" style={{ color: 'var(--color-ink)' }}>
                Auto-mark as reviewed
              </label>
            </div>
            {/* Submit */}
            <div className="flex items-end md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md px-5 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {isPending ? 'Creating…' : 'Create rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules table */}
      {rules.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[10px] border py-16 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-panel)' }}
        >
          <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            No rules yet — create your first rule above
          </p>
        </div>
      ) : (
        <div
          className="rounded-[10px] border overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-panel-2)', borderBottom: '1px solid var(--color-border)' }}>
                {['Rule name', 'Pattern', 'Category', 'Type', 'Auto-review', 'Priority', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[.06em]"
                    style={{ color: 'var(--color-ink-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => (
                <tr
                  key={rule.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: 'var(--color-panel)',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-ink)' }}>
                    {rule.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-mono text-[11px]"
                      style={{ backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink-2)' }}
                    >
                      {rule.descriptionPattern}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-ink-2)' }}>
                    {rule.category?.name ?? <span style={{ color: 'var(--color-ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-ink-2)' }}>
                    {rule.transactionType ?? <span style={{ color: 'var(--color-ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={
                        rule.trustedAutoReview
                          ? { backgroundColor: 'color-mix(in srgb,var(--color-ok) 15%,transparent)', color: 'var(--color-ok)' }
                          : { backgroundColor: 'var(--color-panel-2)', color: 'var(--color-ink-3)' }
                      }
                    >
                      {rule.trustedAutoReview ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-ink-3)' }}>
                    {rule.priority}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleting === rule.id}
                      className="rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-bad)_12%,transparent)] disabled:opacity-40"
                      aria-label="Disable rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-bad)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
