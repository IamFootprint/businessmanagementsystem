'use server'
import { revalidatePath } from 'next/cache'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type SupplierState = { error?: string; ok?: boolean } | null

export async function createSupplierAction(
  _prev: SupplierState,
  formData: FormData
): Promise<SupplierState> {
  const name = formData.get('name') as string
  if (!name?.trim()) return { error: 'Supplier name is required' }

  try {
    await apiRequestAuthenticated('/suppliers', {
      method: 'POST',
      body: { name: name.trim() },
    })
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' }
  }
}

export async function addAliasAction(
  supplierId: string,
  pattern: string
): Promise<{ ok: boolean; error?: string }> {
  if (!pattern.trim()) return { ok: false, error: 'Pattern is required' }
  try {
    await apiRequestAuthenticated(`/suppliers/${supplierId}/aliases`, {
      method: 'POST',
      body: { pattern },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Add alias failed' }
  }
}

export async function removeAliasAction(
  supplierId: string,
  aliasId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/suppliers/${supplierId}/aliases/${aliasId}`, {
      method: 'DELETE',
    })
    revalidatePath('/dashboard/suppliers')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Remove failed' }
  }
}
