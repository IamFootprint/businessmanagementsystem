'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, ExternalLink, Tag } from 'lucide-react'
import { isSafeUrl } from '@/lib/url'
import { useToast } from '@/lib/use-toast'
import { Drawer } from '@/components/ui/drawer'
import { addAliasAction } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Alias = { id: string; pattern: string }

type Supplier = {
  id: string
  name: string
  website: string | null
  notes: string | null
  aliases: Alias[]
}

type RecentTx = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  direction: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  const letters = words.map((w) => w[0]?.toUpperCase() ?? '').filter(Boolean)
  return letters.slice(0, 2).join('')
}

function formatAmount(cents: number, direction: string): string {
  const abs = Math.abs(cents) / 100
  const formatted = abs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return direction === 'CREDIT' ? `+R ${formatted}` : `-R ${formatted}`
}

// ─── Alias chip ───────────────────────────────────────────────────────────────

function AliasChip({ pattern, onRemove }: { pattern: string; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-mono px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: 'var(--color-panel-2)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink-2)',
      }}
    >
      {pattern}
      {onRemove && (
        <button
          onClick={onRemove}
          disabled
          className="opacity-40 ml-0.5 leading-none"
          aria-label={`Remove alias ${pattern}`}
        >
          ×
        </button>
      )}
    </span>
  )
}

// ─── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier, onClick }: { supplier: Supplier; onClick: () => void }) {
  const initials = getInitials(supplier.name)

  return (
    <div
      onClick={onClick}
      className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5 cursor-pointer transition-colors hover:bg-[var(--color-panel-2)]"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div
            className="shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #DB2777)' }}
          >
            {initials}
          </div>
          {/* Name + website */}
          <div className="min-w-0">
            <p
              className="text-[14px] font-semibold truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {supplier.name}
            </p>
            {isSafeUrl(supplier.website) && (
              <a
                href={supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[12px] hover:underline"
                style={{ color: 'var(--color-ink-3)' }}
              >
                {supplier.website.replace(/^https?:\/\//, '')}
                <ExternalLink style={{ width: 10, height: 10 }} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(['MTD spend', 'YTD spend'] as const).map((label) => (
          <div key={label}>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[.04em]"
              style={{ color: 'var(--color-ink-3)' }}
            >
              {label}
            </p>
            <p
              className="mt-0.5 text-[18px] font-semibold tabular-nums"
              style={{ color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}
            >
              R —
            </p>
          </div>
        ))}
      </div>

      {/* Aliases */}
      <div className="mt-4">
        <p
          className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[.04em] mb-1.5"
          style={{ color: 'var(--color-ink-3)' }}
        >
          <Tag style={{ width: 11, height: 11 }} />
          Aliases · {supplier.aliases.length}
        </p>
        {supplier.aliases.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {supplier.aliases.map((a) => (
              <AliasChip key={a.id} pattern={a.pattern} />
            ))}
          </div>
        ) : (
          <p
            className="text-[12px] italic"
            style={{ color: 'var(--color-ink-3)' }}
          >
            No aliases
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Supplier Drawer ──────────────────────────────────────────────────────────

function SupplierDrawer({
  supplier: initialSupplier,
  onClose,
}: {
  supplier: Supplier | null
  onClose: () => void
}) {
  const { toast } = useToast()

  // Local supplier state so we can apply optimistic alias updates
  const [supplier, setSupplier] = useState<Supplier | null>(initialSupplier)

  // Sync when the prop changes (different supplier opened)
  useEffect(() => {
    setSupplier(initialSupplier)
  }, [initialSupplier])

  // Recent transactions
  const [txLoading, setTxLoading] = useState(false)
  const [recentTx, setRecentTx] = useState<RecentTx[]>([])

  useEffect(() => {
    if (!supplier) { setRecentTx([]); return }
    setTxLoading(true)
    fetch(`/api/suppliers/${supplier.id}/transactions?pageSize=8`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((body: { data?: unknown }) =>
        setRecentTx(Array.isArray(body.data) ? (body.data as RecentTx[]) : [])
      )
      .catch(() => setRecentTx([]))
      .finally(() => setTxLoading(false))
  }, [supplier?.id])

  // Add alias state
  const [addingAlias, setAddingAlias] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [aliasLoading, setAliasLoading] = useState(false)
  const aliasInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingAlias) aliasInputRef.current?.focus()
  }, [addingAlias])

  async function handleAddAlias() {
    if (!supplier || !aliasInput.trim()) return
    const supplierId = supplier.id  // capture before any setState
    const pattern = aliasInput.trim()
    const tempId = `optimistic-${Date.now()}`

    setSupplier((prev) =>
      prev ? { ...prev, aliases: [...prev.aliases, { id: tempId, pattern }] } : prev
    )
    setAliasInput('')
    setAddingAlias(false)
    setAliasLoading(true)

    try {
      const result = await addAliasAction(supplierId, pattern)
      if (!result.ok) {
        setSupplier((prev) =>
          prev?.id === supplierId
            ? { ...prev, aliases: prev.aliases.filter((a) => a.id !== tempId) }
            : prev
        )
        toast(result.error ?? 'Failed to add alias')
      } else {
        toast('Alias added')
      }
    } finally {
      setAliasLoading(false)
    }
  }

  if (!supplier) return null

  const description = `${supplier.aliases.length} alias${supplier.aliases.length !== 1 ? 'es' : ''} · ${
    isSafeUrl(supplier.website) ? supplier.website!.replace(/^https?:\/\//, '') : 'no website'
  }`

  return (
    <Drawer
      open={supplier !== null}
      onClose={onClose}
      width={480}
      title={supplier.name}
      description={description}
      footer={
        <button
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-bad)', color: 'var(--color-bad)' }}
          disabled
          aria-label="Delete supplier (not yet implemented)"
        >
          Delete supplier
        </button>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {(['MTD spend', 'YTD spend'] as const).map((label) => (
          <div
            key={label}
            className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3.5"
          >
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[.04em]"
              style={{ color: 'var(--color-ink-3)' }}
            >
              {label}
            </p>
            <p
              className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] tabular-nums"
              style={{ color: 'var(--color-ink)' }}
            >
              R —
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)] my-4" />

      {/* Aliases section */}
      <div>
        <p className="text-[12px] font-semibold mb-2.5" style={{ color: 'var(--color-ink)' }}>
          Description aliases
        </p>
        <div className="flex flex-wrap gap-1.5">
          {supplier.aliases.map((a) => (
            <AliasChip
              key={a.id}
              pattern={a.pattern}
              onRemove={() => {
                // stub — removeAliasAction not implemented
              }}
            />
          ))}

          {addingAlias ? (
            <span
              className="inline-flex items-center gap-1 text-[12px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--color-panel-2)',
                borderColor: 'var(--color-border)',
              }}
            >
              <input
                ref={aliasInputRef}
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAlias()
                  if (e.key === 'Escape') { setAddingAlias(false); setAliasInput('') }
                }}
                placeholder="pattern…"
                className="bg-transparent outline-none w-28 text-[12px] font-mono"
                style={{ color: 'var(--color-ink-2)' }}
                disabled={aliasLoading}
              />
              <button
                onClick={handleAddAlias}
                disabled={aliasLoading || !aliasInput.trim()}
                className="text-[var(--color-accent)] font-semibold text-[11px] disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingAlias(false); setAliasInput('') }}
                className="text-[var(--color-ink-3)] text-[11px]"
                aria-label="Cancel"
              >
                ×
              </button>
            </span>
          ) : (
            <button
              onClick={() => setAddingAlias(true)}
              className="inline-flex items-center gap-1 text-[12px] font-mono px-2 py-0.5 rounded-full border transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              + Add alias
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)] my-4" />

      {/* Recent transactions */}
      <div>
        <p className="text-[12px] font-semibold mb-2.5" style={{ color: 'var(--color-ink)' }}>
          Recent transactions
        </p>
        {txLoading ? (
          <p className="text-[12px] text-center py-4" style={{ color: 'var(--color-ink-3)' }}>
            Loading…
          </p>
        ) : recentTx.length === 0 ? (
          <p className="text-[12px] text-center py-4" style={{ color: 'var(--color-ink-3)' }}>
            No transactions yet
          </p>
        ) : (
          <div className="space-y-0">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
              >
                <div className="min-w-0">
                  <p
                    className="text-[12px] font-mono"
                    style={{ color: 'var(--color-ink-2)' }}
                  >
                    {tx.transactionDate}
                  </p>
                  <p
                    className="text-[13px] font-medium truncate max-w-[280px]"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {tx.rawDescription}
                  </p>
                </div>
                <p
                  className="text-[13px] font-semibold font-mono tabular-nums shrink-0 ml-4"
                  style={{
                    color:
                      tx.direction === 'CREDIT'
                        ? 'var(--color-pos)'
                        : 'var(--color-neg)',
                  }}
                >
                  {formatAmount(tx.amountCents, tx.direction)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export function SuppliersClient({ suppliers: initialSuppliers }: { suppliers: Supplier[] }) {
  const [suppliers] = useState<Supplier[]>(initialSuppliers)
  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null)

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-[26px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Suppliers
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} · description aliases auto-map imported transactions
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add supplier
        </button>
      </div>

      {/* Grid or empty state */}
      {suppliers.length === 0 ? (
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] flex flex-col items-center gap-3 py-16 text-center">
          <Building2
            className="w-10 h-10"
            style={{ color: 'var(--color-ink-3)' }}
          />
          <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
            No suppliers yet. Suppliers are created when transactions are categorised.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => setActiveSupplier(supplier)}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      <SupplierDrawer
        supplier={activeSupplier}
        onClose={() => setActiveSupplier(null)}
      />
    </div>
  )
}
