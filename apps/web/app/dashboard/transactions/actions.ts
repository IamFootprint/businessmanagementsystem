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

export type ReceiptCaptureActionResult = {
  ok: boolean
  error?: string
  receipt?: {
    id: string
    storagePath: string
    hintAmountCents: number | null
    hintDate: string | null
    hintSupplier: string | null
    hintBusinessId: string | null
    matchStatus: string
  }
  ocr?: {
    merchant: string | null
    transactionDate: string | null
    totalAmount: number | null
    vatAmount: number | null
    currency: string | null
    rawText: string
    confidence: 'high' | 'medium' | 'low'
  }
  suggestion?: {
    supplierId: string | null
    supplierMatch: { id: string; name: string; score: number } | null
    businessId: string | null
    categoryId: string | null
    transactionType: string | null
    isPersonal: boolean | null
  }
}

export async function captureReceiptAction(formData: FormData): Promise<ReceiptCaptureActionResult> {
  try {
    return await apiRequestAuthenticated<ReceiptCaptureActionResult>('/receipts/capture', {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Capture failed' }
  }
}
