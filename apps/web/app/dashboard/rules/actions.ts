'use server'
import { revalidatePath } from 'next/cache'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export type RuleFormState = { error?: string; ok?: boolean } | null

export async function createRuleAction(
  _prev: RuleFormState,
  formData: FormData
): Promise<RuleFormState> {
  const name = (formData.get('name') as string)?.trim()
  const descriptionPattern = (formData.get('descriptionPattern') as string)?.trim()
  const categoryId = (formData.get('categoryId') as string) || undefined
  const supplierId = (formData.get('supplierId') as string) || undefined
  const transactionType = (formData.get('transactionType') as string) || undefined
  const trustedAutoReview = formData.get('trustedAutoReview') === 'true'
  const priority = parseInt(formData.get('priority') as string ?? '0', 10)

  if (!name) return { error: 'Name is required' }
  if (!descriptionPattern) return { error: 'Description pattern is required' }

  try {
    await apiRequestAuthenticated('/rules', {
      method: 'POST',
      body: {
        name,
        descriptionPattern,
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(transactionType ? { transactionType } : {}),
        trustedAutoReview,
        priority: isNaN(priority) ? 0 : priority,
      },
    })
    revalidatePath('/dashboard/rules')
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' }
  }
}

export async function deleteRuleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/rules/${id}`, { method: 'DELETE' })
    revalidatePath('/dashboard/rules')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}

export async function applyRulesAction(): Promise<{ applied?: number; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ applied: number }>('/rules/apply', {
      method: 'POST',
    })
    revalidatePath('/dashboard/transactions')
    return { applied: result.applied }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Apply failed' }
  }
}
