'use client'
import { useActionState } from 'react'
import Image from 'next/image'
import { loginAction } from './actions'
import type { LoginState } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <div className="flex w-full max-w-sm flex-col px-6 animate-fade-in">
      {/* Brand area */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--accent-dim)', border: '1px solid rgba(212,160,23,0.25)' }}
        >
          <Image
            src="/brand/kh-logo-64.png"
            alt="Kgolaentle Holdings"
            width={40}
            height={40}
            className="rounded-lg"
          />
        </div>

        <div className="text-center">
          <p
            className="mb-1 text-[11px] font-semibold uppercase tracking-[.18em]"
            style={{ color: 'var(--color-accent)' }}
          >
            BMS
          </p>
          <h1
            className="font-display text-[28px] leading-tight"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}
          >
            Business
            <br />
            <span style={{ fontStyle: 'italic' }}>Management</span>
          </h1>
          <p
            className="mt-1.5 text-[13px]"
            style={{ color: 'var(--color-ink-3)' }}
          >
            Kgolaentle Holdings
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="animate-slide-up delay-1">
        <p
          className="mb-6 text-[22px] font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}
        >
          Welcome back
        </p>

        {state?.error && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-[13px]"
            style={{
              background: 'var(--neg-bg)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: 'var(--color-neg)',
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[12px] font-medium uppercase tracking-[.08em]"
              style={{ color: 'var(--color-ink-2)' }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@kgolaentle.com"
              className="h-12 w-full rounded-xl px-4 text-[15px] outline-none transition-all"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-ink)',
                caretColor: 'var(--color-accent)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[12px] font-medium uppercase tracking-[.08em]"
              style={{ color: 'var(--color-ink-2)' }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-12 w-full rounded-xl px-4 text-[15px] outline-none transition-all"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-ink)',
                caretColor: 'var(--color-accent)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 h-13 w-full rounded-xl text-[15px] font-semibold transition-opacity"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p
          className="mt-8 text-center text-[12px]"
          style={{ color: 'var(--color-ink-3)' }}
        >
          Restricted to @kgolaentle.com accounts
        </p>
      </div>
    </div>
  )
}
