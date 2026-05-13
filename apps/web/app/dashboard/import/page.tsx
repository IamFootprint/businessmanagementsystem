'use client'
import { useActionState } from 'react'
import { importCsvAction } from './actions'
import type { ImportState } from './actions'

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  )

  return (
    <main style={{ padding: 32, maxWidth: 600 }}>
      <h1>Import Bank Statement</h1>
      <form action={formAction}>
        {state?.error && (
          <p style={{ color: 'red', marginBottom: 12 }}>{state.error}</p>
        )}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="bankAccountId" style={{ display: 'block', marginBottom: 4 }}>
            Bank Account ID
          </label>
          <input
            id="bankAccountId"
            name="bankAccountId"
            type="text"
            required
            placeholder="seed-stdbank-main"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="file" style={{ display: 'block', marginBottom: 4 }}>
            CSV File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{ padding: '10px 24px', cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          {isPending ? 'Importing...' : 'Import'}
        </button>
      </form>

      {state?.summary && (
        <div style={{ marginTop: 24, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
          <h2>Import Complete</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td>File</td><td><strong>{state.summary.fileName}</strong></td></tr>
              <tr><td>Total rows</td><td>{state.summary.rowCount}</td></tr>
              <tr><td>Imported</td><td style={{ color: 'green' }}>{state.summary.importedCount}</td></tr>
              <tr><td>Duplicates skipped</td><td>{state.summary.duplicateCount}</td></tr>
              <tr><td>Errors</td><td style={{ color: state.summary.errorCount > 0 ? 'red' : 'inherit' }}>{state.summary.errorCount}</td></tr>
              <tr><td>Opening balance</td><td>{formatCents(state.summary.openingBalanceCents)}</td></tr>
              <tr><td>Closing balance</td><td>{formatCents(state.summary.closingBalanceCents)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
