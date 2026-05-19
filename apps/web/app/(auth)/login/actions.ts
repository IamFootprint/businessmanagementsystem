'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiRequest } from '@/lib/api-client'

export type LoginState =
  | null
  | { status: 'idle' }
  | { status: 'error'; error: string; email?: string; attemptsUsed?: number; attemptsMax?: number }
  | { status: '2fa-required'; email?: string }
  | { status: 'locked'; retryAfter?: number }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { status: 'error', error: 'Email and password are required' }
  }

  let token: string
  try {
    const result = await apiRequest<{ token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    token = result.token
  } catch {
    return { status: 'error', error: 'Invalid email or password', email }
  }

  const cookieStore = await cookies()
  cookieStore.set('bms-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || (process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') ?? false),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect('/dashboard')
}
