'use server'
import { apiRequest } from '@/lib/api-client'

export async function uploadReceiptAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const file = formData.get('file')
  const phone = formData.get('phone')

  if (!file || typeof file === 'string') return { error: 'Please attach a file.' }

  const MAX_BYTES = 10 * 1024 * 1024
  if ((file as File).size > MAX_BYTES) {
    return { error: 'File exceeds the 10 MB limit.' }
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  if (!ALLOWED_TYPES.includes((file as File).type)) {
    return { error: 'Only images and PDF files are accepted.' }
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) return { error: 'Phone number is required.' }

  try {
    await apiRequest<{ receiptId: string }>('/receipts/public', {
      method: 'POST',
      body: formData,
    })
    return { success: true }
  } catch {
    return { error: 'Upload failed. Please try again.' }
  }
}
