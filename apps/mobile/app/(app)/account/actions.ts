'use server'
import { apiRequestAuthenticated } from '@/lib/api-client.server'

export async function updateProfileAction(
  data: { name?: string; phone?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated('/auth/me', { method: 'PATCH', body: data })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update profile' }
  }
}

export async function changePasswordAction(
  data: { currentPassword: string; newPassword: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated('/auth/change-password', { method: 'POST', body: data })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to change password' }
  }
}

export async function signOutAllAction(): Promise<{ ok: boolean; revoked?: number; error?: string }> {
  try {
    const result = await apiRequestAuthenticated<{ ok: true; revoked: number }>(
      '/auth/sign-out-all',
      { method: 'POST' },
    )
    return { ok: true, revoked: result.revoked }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to sign out other sessions' }
  }
}

export async function revokeSessionAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiRequestAuthenticated(`/auth/sessions/${sessionId}`, { method: 'DELETE' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to revoke session' }
  }
}
