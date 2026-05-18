'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export async function updateTransactionAction(
  transactionId: string,
  data: { categoryId?: string | null; reviewStatus?: string; notes?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/transactions/${transactionId}`, {
      method: 'PATCH',
      body: data,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function applyRulesAction(): Promise<{ applied: number; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ applied: number }>('/rules/apply', {
      method: 'POST',
    })
    return result
  } catch (err) {
    return { applied: 0, error: err instanceof Error ? err.message : 'Apply rules failed' }
  }
}

export async function bulkUpdateTransactionsAction(
  ids: string[],
  data: { categoryId?: string | null; reviewStatus?: string }
): Promise<{ ok: boolean; updated: number; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ updated: number }>('/transactions/bulk', {
      method: 'PATCH',
      body: { ids, ...data },
    })
    return { ok: true, updated: result.updated }
  } catch (err) {
    return { ok: false, updated: 0, error: err instanceof Error ? err.message : 'Bulk update failed' }
  }
}

export async function createManualTransactionAction(
  formData: FormData
): Promise<{ ok: boolean; transactionId?: string; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ ok: true; transactionId: string }>(
      '/transactions/manual',
      { method: 'POST', body: formData },
    )
    return { ok: true, transactionId: result.transactionId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create transaction' }
  }
}
