'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/use-toast'
import { Shield, Monitor, MapPin, Clock, LogOut, AlertTriangle } from 'lucide-react'
import type { Me, SessionRow } from './page'
import {
  updateProfileAction, changePasswordAction, signOutAllAction, revokeSessionAction,
} from './actions'

const ROLE_LABEL: Record<string, string> = {
  TENANT_OWNER: 'Owner',
  FINANCE_MANAGER: 'Finance manager',
  ACCOUNTANT: 'Accountant',
  AUDITOR: 'Auditor',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function summariseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Browser'
}

export function AccountClient({ me, sessions }: { me: Me; sessions: SessionRow[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [, startTransition] = useTransition()

  // Profile state
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(me.phone ?? '')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Session state
  const [revoking, setRevoking] = useState<string | null>(null)
  const [signingOutAll, setSigningOutAll] = useState(false)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    const result = await updateProfileAction({ name, phone: phone.trim() || null })
    setProfileSaving(false)
    if (!result.ok) return toast(result.error ?? 'Failed to update profile')
    toast('Profile updated')
    startTransition(() => router.refresh())
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match')
      return
    }
    setPwSaving(true)
    const result = await changePasswordAction({ currentPassword, newPassword })
    setPwSaving(false)
    if (!result.ok) {
      setPwError(result.error ?? 'Failed to change password')
      return
    }
    toast('Password changed — other devices signed out')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    startTransition(() => router.refresh())
  }

  const handleSignOutAll = async () => {
    setSigningOutAll(true)
    const result = await signOutAllAction()
    setSigningOutAll(false)
    if (!result.ok) return toast(result.error ?? 'Failed to sign out other sessions')
    toast(`Signed out ${result.revoked ?? 0} other session${result.revoked === 1 ? '' : 's'}`)
    startTransition(() => router.refresh())
  }

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId)
    const result = await revokeSessionAction(sessionId)
    setRevoking(null)
    if (!result.ok) return toast(result.error ?? 'Failed to revoke session')
    toast('Session revoked')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-6 px-[var(--page-gutter)] py-6">
      {/* Page head */}
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">Account</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-ink-3)]">Your profile, password, and active sessions.</p>
      </div>

      {/* Profile */}
      <Section title="Profile" description="Email and role are managed by an owner. Update your display name and phone yourself.">
        <form onSubmit={handleProfileSave} className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField label="Email" value={me.email} />
          <ReadOnlyField label="Role" value={ROLE_LABEL[me.role] ?? me.role} />

          <Field label="Display name" htmlFor="profile-name">
            <input
              id="profile-name"
              type="text" value={name} required maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>

          <Field label="Phone" htmlFor="profile-phone">
            <input
              id="profile-phone"
              type="tel" value={phone} placeholder="+27 …"
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>

          <div className="md:col-span-2 flex items-center justify-between text-[12px] text-[var(--color-ink-3)]">
            <span>
              Last sign-in: {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : 'never'}
            </span>
            <button
              type="submit" disabled={profileSaving}
              className="h-9 rounded-md px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section
        title="Password"
        description="Minimum 10 characters with at least one letter and one digit. Changing your password signs out every other device."
        icon={<Shield className="h-4 w-4" />}
      >
        <form onSubmit={handlePasswordSave} className="grid max-w-md gap-3">
          <Field label="Current password" htmlFor="pw-current">
            <input
              id="pw-current" type="password" autoComplete="current-password" required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>
          <Field label="New password" htmlFor="pw-new">
            <input
              id="pw-new" type="password" autoComplete="new-password" required minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm">
            <input
              id="pw-confirm" type="password" autoComplete="new-password" required minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>

          {pwError && (
            <div role="alert" className="rounded-md px-3 py-2 text-[12.5px]" style={{ backgroundColor: 'var(--color-bad-bg)', color: 'var(--color-bad)' }}>
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              {pwError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit" disabled={pwSaving}
              className="h-9 rounded-md px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              {pwSaving ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </Section>

      {/* Sessions */}
      <Section
        title="Active sessions"
        description="Every device currently signed in to your account. Revoke any session you don't recognise."
        icon={<Monitor className="h-4 w-4" />}
        right={
          sessions.length > 1 ? (
            <button
              type="button" onClick={handleSignOutAll} disabled={signingOutAll}
              className="h-8 rounded-md border border-[var(--color-border)] px-3 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)] disabled:opacity-60"
            >
              {signingOutAll ? 'Signing out…' : 'Sign out everywhere else'}
            </button>
          ) : null
        }
      >
        <div className="divide-y divide-[var(--color-border)]">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--color-ink)]">
                  <Monitor className="h-3.5 w-3.5 text-[var(--color-ink-3)]" />
                  {summariseUserAgent(s.userAgent)}
                  {s.current && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.05em]"
                      style={{ backgroundColor: 'var(--color-ok-bg)', color: 'var(--color-ok)' }}
                    >
                      This device
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--color-ink-3)]">
                  {s.ipAddress && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.ipAddress}</span>
                  )}
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />active {timeAgo(s.lastSeenAt)}</span>
                  <span>created {timeAgo(s.createdAt)}</span>
                  <span>expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
              {!s.current && (
                <button
                  type="button" onClick={() => handleRevoke(s.id)} disabled={revoking === s.id}
                  className="h-8 rounded-md border border-[var(--color-border)] px-3 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-panel-2)] disabled:opacity-60"
                >
                  <LogOut className="mr-1 inline h-3 w-3" />
                  {revoking === s.id ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({
  title, description, icon, right, children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-ink)]">
            {icon}
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-3)]">{description}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">
        {label}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-ink-3)]">{label}</span>
      <div className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 flex items-center text-[13px] text-[var(--color-ink-2)]">
        {value}
      </div>
    </div>
  )
}
