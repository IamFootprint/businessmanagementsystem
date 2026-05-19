'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { loginAction } from '../login/actions'
import type { LoginState } from '../login/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Brand ─────────────────────────────────────────────────────────────────
const BRAND_GRAD = 'linear-gradient(135deg, #FF1F8E 0%, #8B3FE8 50%, #2A78F0 100%)'

// ─── Inline SVG icons ──────────────────────────────────────────────────────
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M3.5 6.5l6.5 5 6.5-5" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="9" rx="2" />
      <path d="M7 9V6.5a3 3 0 016 0V9" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10S4 4.5 10 4.5 18.5 10 18.5 10 16 15.5 10 15.5 1.5 10 1.5 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l14 14M9 5a8 8 0 019.5 5 9 9 0 01-1.7 2.4M6 6.5A9 9 0 001.5 10S4 15.5 10 15.5a8 8 0 003.5-.8M8.5 8.5a2 2 0 002.8 2.8" />
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}
function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5l6 2v5c0 4-2.7 7-6 8-3.3-1-6-4-6-8v-5l6-2z" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  )
}
function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="13" r="3" />
      <path d="M9 11l7-7M13.5 6.5L15 8M11.5 8.5L13 10" />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5v4M10 13.4v.1" />
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <circle cx="10" cy="10" r="7" opacity=".18" />
      <path d="M17 10a7 7 0 00-7-7" />
    </svg>
  )
}

// ─── Atoms ─────────────────────────────────────────────────────────────────
function StatusDot({ color = '#5BE584' }: { color?: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color, animation: 'admin-pulse 2s ease-out infinite' }}
    />
  )
}

function EyebrowPill() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5"
      style={{
        background: 'rgba(139, 63, 232, 0.12)',
        borderColor: 'rgba(139, 63, 232, 0.30)',
        color: '#D9C8FF',
        fontFamily: 'var(--font-mono-admin)',
        fontSize: '10.5px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      <StatusDot color="#8B3FE8" />
      Internal · Admin Portal
    </div>
  )
}

// ─── Brand panel (left rail, hidden < lg) ──────────────────────────────────
function BrandPanel() {
  return (
    <aside
      className="relative hidden w-[480px] shrink-0 flex-col overflow-hidden border-r border-[#1B1B24] lg:flex"
      style={{
        padding: '40px 44px',
        background: 'radial-gradient(120% 80% at 0% 0%, #1A1428 0%, #0A0A12 55%, #08080C 100%)',
      }}
    >
      {/* hairline grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)',
        }}
      />
      {/* gradient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: -120, top: 120, width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(139,63,232,0.33) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      {/* wordmark */}
      <div className="relative z-10 flex items-center gap-3.5">
        <Image src="/pap-logo.png" alt="Plug A Pro" width={36} height={36} priority />
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[17px] font-extrabold tracking-tight"
            style={{ background: BRAND_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Plug A Pro
          </span>
          <span style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E78' }}>
            Admin Console
          </span>
        </div>
      </div>

      {/* statement */}
      <div className="relative z-10 mt-auto">
        <div className="mb-6">
          <EyebrowPill />
        </div>
        <h1
          className="m-0 max-w-[360px] font-bold text-[#FAFAFB]"
          style={{ fontSize: '56px', lineHeight: 1.02, letterSpacing: '-0.04em', fontFamily: 'var(--font-sans-admin)' }}
        >
          Restricted access.
          <br />
          <span style={{ background: BRAND_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Operators only.
          </span>
        </h1>
        <p className="mt-4 max-w-[340px] leading-[1.55] text-[#9A9AA6]" style={{ fontSize: '14.5px' }}>
          Use your Plug A Pro work account. SSO and second-factor are enforced for every session.
        </p>
      </div>

      {/* metadata grid */}
      <div
        className="relative z-10 mt-12 grid grid-cols-2 border-t border-[#1B1B24] pt-[18px]"
        style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', gap: '14px 18px' }}
      >
        {(
          [
            ['Region', 'af-south-1', false],
            ['Build', process.env.NEXT_PUBLIC_BUILD_REF ?? 'web@dev', false],
            ['Tenant', 'plugapro · admin', false],
            ['Status', 'all systems normal', true],
          ] as [string, string, boolean][]
        ).map(([k, v, dot]) => (
          <div key={k}>
            <div className="mb-1 uppercase tracking-wider text-[#5C5C68]">{k}</div>
            <div className="flex items-center gap-1.5 text-[#C8C8D2]">
              {dot && <StatusDot />}
              {v}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  right,
  error,
  children,
}: {
  label: string
  htmlFor: string
  right?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label
          htmlFor={htmlFor}
          className="border-0 bg-transparent p-0 text-[#9A9AA6]"
          style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          {label}
        </Label>
        {right}
      </div>
      {children}
      {error && (
        <div
          className="mt-2 flex items-center gap-1.5 text-[#FF8AA0]"
          style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.06em' }}
        >
          <AlertIcon />
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Styled input with focus ring ──────────────────────────────────────────
function StyledInput({
  icon,
  rightIcon,
  hasError,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  hasError?: boolean
}) {
  const [focused, setFocused] = useState(false)

  const borderColor = hasError ? '#7A2E3E' : focused ? '#3A2A66' : '#1F1F28'
  const shadow = hasError
    ? '0 0 0 4px rgba(255,83,112,0.13)'
    : focused
    ? '0 0 0 4px rgba(139,63,232,0.13)'
    : 'none'

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3.5 transition-[border-color,box-shadow] duration-150"
      style={{ background: '#101018', border: `1px solid ${borderColor}`, boxShadow: shadow, height: '52px' }}
    >
      {icon && (
        <span className="flex shrink-0 transition-colors duration-150" style={{ color: focused ? '#B8A8FF' : '#5C5C68' }}>
          {icon}
        </span>
      )}
      <Input
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e) }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e) }}
        className="h-auto flex-1 border-0 bg-transparent p-0 text-[#FAFAFB] placeholder:text-[#5C5C68] focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ fontSize: '14.5px' }}
      />
      {rightIcon}
    </div>
  )
}

// ─── Submit button (gradient hairline border trick) ─────────────────────────
function SubmitButton({ pending, disabled, label = 'Sign in to admin' }: { pending?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="relative mt-1.5 flex w-full items-center justify-between overflow-hidden rounded-[14px] border border-white/10 px-[22px] font-semibold text-[#FAFAFB] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        height: '54px',
        fontSize: '14.5px',
        letterSpacing: '0.014em',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        fontFamily: 'var(--font-sans-admin)',
      }}
    >
      {/* gradient hairline border */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[14px] p-px opacity-45"
        style={{
          background: BRAND_GRAD,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <span className="flex items-center gap-2.5">
        {pending ? <SpinnerIcon /> : <ShieldIcon size={14} />}
        {pending ? 'Verifying…' : label}
      </span>
      {!pending && <ArrowIcon />}
    </button>
  )
}

// ─── 2FA stub ──────────────────────────────────────────────────────────────
function TwoFactorStep({ formAction, pending }: { formAction: (payload: FormData) => void; pending: boolean }) {
  return (
    <>
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[#9CECB1]"
        style={{ background: 'rgba(91,229,132,0.10)', borderColor: 'rgba(91,229,132,0.25)', fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        <ShieldIcon size={12} />
        Step 2 of 2
      </div>
      <h2 className="m-0 font-bold text-[#FAFAFB]" style={{ fontSize: '32px', letterSpacing: '-0.025em', fontFamily: 'var(--font-sans-admin)' }}>
        Confirm with 2FA
      </h2>
      <p className="mb-9 mt-2 leading-[1.5] text-[#7E7E8A]" style={{ fontSize: '14.5px' }}>
        Enter the 6-digit code from your authenticator app. Codes refresh every 30 seconds.
      </p>
      <form action={formAction}>
        <input
          name="otp"
          maxLength={6}
          autoFocus
          className="h-16 w-full rounded-xl border border-[#1F1F28] bg-[#101018] px-4 text-center text-white placeholder:text-[#5C5C68] focus:outline-none"
          style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '28px', letterSpacing: '0.5em' }}
          placeholder="······"
        />
        <div className="mt-6">
          <SubmitButton pending={pending} label="Confirm & continue" />
        </div>
      </form>
    </>
  )
}

// ─── Locked state ──────────────────────────────────────────────────────────
function LockedState({ retryAfterSec }: { retryAfterSec: number }) {
  const m = Math.floor(retryAfterSec / 60)
  const s = retryAfterSec % 60
  return (
    <>
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[#FF8AA0]"
        style={{ background: 'rgba(255,80,100,0.10)', borderColor: 'rgba(255,80,100,0.30)', fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        <AlertIcon />
        Account locked
      </div>
      <h2 className="m-0 font-bold text-[#FAFAFB]" style={{ fontSize: '32px', letterSpacing: '-0.025em', fontFamily: 'var(--font-sans-admin)' }}>
        Too many attempts
      </h2>
      <p className="mb-9 mt-2 leading-[1.55] text-[#9A9AA6]" style={{ fontSize: '14.5px' }}>
        We've locked sign-in for this account for 15 minutes. If this wasn't you, contact{' '}
        <a className="text-[#B8A8FF]" href="mailto:security@plugapro.co.za">security@plugapro.co.za</a>{' '}
        immediately.
      </p>
      <div className="flex items-center justify-between rounded-xl border border-[#1F1F28] bg-[#101018] p-5">
        <div>
          <div className="mb-1 uppercase tracking-wider text-[#7E7E8A]" style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px' }}>
            Unlocks in
          </div>
          <div className="font-medium text-[#FAFAFB] tracking-wider" style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '28px' }}>
            {String(m).padStart(2, '0')} : {String(s).padStart(2, '0')}
          </div>
        </div>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl border text-[#FF8AA0]"
          style={{ background: 'rgba(255,80,100,0.08)', borderColor: 'rgba(255,80,100,0.25)' }}
        >
          <LockIcon />
        </div>
      </div>
      <div className="mt-6">
        <SubmitButton disabled label="Sign in disabled" />
      </div>
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AdminSignInPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null)
  const [showPwd, setShowPwd] = useState(false)

  const isError = state?.status === 'error'
  const is2fa = state?.status === '2fa-required'
  const isLocked = state?.status === 'locked'

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <style>{`
        @keyframes admin-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(91,229,132,0.4); }
          70%  { box-shadow: 0 0 0 6px rgba(91,229,132,0);   }
          100% { box-shadow: 0 0 0 0   rgba(91,229,132,0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-pulse-dot { animation: none !important; }
        }
      `}</style>

      <BrandPanel />

      <main className="relative flex flex-1 flex-col bg-[#0E0E14]">
        {/* top status row */}
        <div
          className="flex items-center justify-between px-11 pt-7 text-[#5C5C68]"
          style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '11px', letterSpacing: '0.06em' }}
        >
          <span>plugapro.co.za / admin / sign-in</span>
          <span className="flex items-center gap-2.5">
            <StatusDot />
            SECURE · TLS 1.3
          </span>
        </div>

        {/* form column */}
        <div className="flex flex-1 flex-col justify-center px-6 lg:px-24">
          <div className="mx-auto w-full max-w-[440px] lg:mx-0">

            {!is2fa && !isLocked && (
              <>
                <h2
                  className="m-0 font-bold text-[#FAFAFB]"
                  style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.025em', fontFamily: 'var(--font-sans-admin)' }}
                >
                  Team sign in
                </h2>
                <p className="mb-9 mt-2 leading-[1.5] text-[#7E7E8A]" style={{ fontSize: '14.5px' }}>
                  Authenticate with your work email to access ops, dispatch, and audit tools.
                </p>

                {isError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border p-3.5"
                    style={{ background: 'rgba(255, 80, 100, 0.06)', borderColor: 'rgba(255, 80, 100, 0.22)' }}
                  >
                    <span className="mt-0.5 flex shrink-0 text-[#FF8AA0]"><AlertIcon /></span>
                    <div>
                      <div className="font-semibold text-[#FFC8D0]" style={{ fontSize: '13.5px' }}>
                        We couldn't sign you in.
                      </div>
                      <div
                        className="mt-0.5 tracking-wide text-[#FF8AA0]"
                        style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px' }}
                      >
                        err·auth/invalid-credentials
                        {state.attemptsUsed != null && state.attemptsMax != null && (
                          <> · {state.attemptsUsed} of {state.attemptsMax} attempts used</>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <form action={formAction} className="flex flex-col gap-[22px]">
                  <Field label="Work email" htmlFor="admin-email">
                    <StyledInput
                      id="admin-email"
                      name="email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="you@plugapro.co.za"
                      defaultValue={isError ? (state.email ?? '') : ''}
                      icon={<MailIcon />}
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="admin-password"
                    error={isError ? 'Email or password is incorrect.' : undefined}
                    right={
                      <a
                        href="/forgot-password"
                        className="text-[#9A8AE8] hover:text-[#B8A8FF] transition-colors"
                        style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}
                      >
                        Forgot?
                      </a>
                    }
                  >
                    <StyledInput
                      id="admin-password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      icon={<LockIcon />}
                      hasError={isError}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="flex shrink-0 cursor-pointer border-0 bg-transparent p-1 text-[#7E7E8A] hover:text-[#C8C8D2] transition-colors"
                          aria-label={showPwd ? 'Hide password' : 'Show password'}
                        >
                          {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      }
                    />
                  </Field>

                  <SubmitButton pending={pending} />

                  <div
                    className="mt-1 flex items-center gap-3 uppercase text-[#5C5C68]"
                    style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.08em' }}
                  >
                    <div className="h-px flex-1 bg-[#1B1B24]" />
                    or
                    <div className="h-px flex-1 bg-[#1B1B24]" />
                  </div>

                  <button
                    type="button"
                    className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#1F1F28] bg-transparent text-[#C8C8D2] transition-colors hover:bg-white/[0.02]"
                    style={{ fontSize: '13.5px' }}
                    onClick={() => { window.location.href = '/admin-sign-in?sso=google' }}
                  >
                    <KeyIcon />
                    Continue with SSO (Google Workspace)
                  </button>
                </form>
              </>
            )}

            {is2fa && <TwoFactorStep formAction={formAction} pending={pending} />}
            {isLocked && <LockedState retryAfterSec={state.retryAfter ?? 900} />}
          </div>
        </div>

        {/* audit footer */}
        <footer
          className="flex items-center justify-between border-t border-[#1B1B24] px-11 py-3.5 text-[#5C5C68]"
          style={{ fontFamily: 'var(--font-mono-admin)', fontSize: '10.5px', letterSpacing: '0.06em' }}
        >
          <span className="flex items-center gap-2.5">
            <ShieldIcon size={13} />
            All actions are logged and audited. Unauthorized access is prohibited.
          </span>
          <span>v {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'} · © Plug A Pro</span>
        </footer>
      </main>
    </div>
  )
}
