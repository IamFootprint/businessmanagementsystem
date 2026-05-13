'use client'
import { useActionState } from 'react'
import { loginAction } from './actions'
import type { LoginState } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <main style={{ maxWidth: 400, margin: '100px auto', padding: '0 16px' }}>
      <h1>BMS — Sign in</h1>
      <form action={formAction}>
        {state?.error && (
          <p style={{ color: 'red', marginBottom: 12 }}>{state.error}</p>
        )}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{ width: '100%', padding: '10px', cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
