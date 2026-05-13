'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type ImportSummary = {
  importId: string
  fileName: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  errorCount: number
  openingBalanceCents: number | null
  closingBalanceCents: number | null
}

export type ImportState = {
  summary?: ImportSummary
  error?: string
} | null

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get('file')
  const bankAccountId = formData.get('bankAccountId')

  if (!file || typeof file === 'string') {
    return { error: 'Please select a CSV file' }
  }
  if (!bankAccountId || typeof bankAccountId !== 'string') {
    return { error: 'Bank account ID is required' }
  }

  const apiForm = new FormData()
  apiForm.append('file', file)
  apiForm.append('bankAccountId', bankAccountId)

  try {
    const summary = await apiRequestAuthenticated<ImportSummary>('/imports', {
      method: 'POST',
      body: apiForm,
    })
    return { summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    return { error: msg }
  }
}
