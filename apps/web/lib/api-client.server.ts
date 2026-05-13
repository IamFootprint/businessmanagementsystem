import { cookies } from 'next/headers'
import { apiRequest } from './api-client'

type ApiOptions = Parameters<typeof apiRequest>[1]

export async function apiRequestAuthenticated<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const cookieStore = await cookies()
  const token = cookieStore.get('bms-session')?.value
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> ?? {}),
    },
  })
}
