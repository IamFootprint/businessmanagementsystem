'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type ReceiptCaptureResult = {
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

export async function captureReceiptAction(formData: FormData): Promise<ReceiptCaptureResult> {
  try {
    const result = await apiRequestAuthenticated<ReceiptCaptureResult>('/receipts/capture', {
      method: 'POST',
      body: formData,
    })
    return result
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Capture failed' }
  }
}

export async function confirmReceiptAction(formData: FormData): Promise<{ ok: boolean; transactionId?: string; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ ok: true; transactionId: string }>(
      '/transactions/manual',
      { method: 'POST', body: formData },
    )
    return { ok: true, transactionId: result.transactionId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to confirm' }
  }
}
