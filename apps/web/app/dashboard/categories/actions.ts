'use server'
import { revalidatePath } from 'next/cache'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type CategoryFormState = { error?: string; ok?: boolean } | null

const VALID_TYPES = ['REVENUE', 'EXPENSE', 'TRANSFER', 'OWNER', 'LOAN', 'TAX', 'UNKNOWN'] as const
type CategoryType = (typeof VALID_TYPES)[number]

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const name = (formData.get('name') as string)?.trim()
  const categoryType = formData.get('categoryType') as CategoryType
  const receiptRequired = formData.get('receiptRequired') === 'true'

  if (!name) return { error: 'Name is required' }
  if (!VALID_TYPES.includes(categoryType)) return { error: 'Invalid category type' }

  try {
    await apiRequestAuthenticated('/categories', {
      method: 'POST',
      body: { name, categoryType, receiptRequired },
    })
    revalidatePath('/dashboard/categories')
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' }
  }
}

export async function updateCategoryAction(
  id: string,
  data: { name?: string; receiptRequired?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/categories/${id}`, {
      method: 'PATCH',
      body: data,
    })
    revalidatePath('/dashboard/categories')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function archiveCategoryAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/categories/${id}`, { method: 'DELETE' })
    revalidatePath('/dashboard/categories')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Archive failed' }
  }
}
