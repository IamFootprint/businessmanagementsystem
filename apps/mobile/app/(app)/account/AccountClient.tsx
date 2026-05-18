'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Monitor, MapPin, Clock, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
  const [, startTransition] = useTransition()

  // Profile
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(me.phone ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Sessions
  const [revoking, setRevoking] = useState<string | null>(null)
  const [signingOutAll, setSigningOutAll] = useState(false)
  const [sessionMsg, setSessionMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    const result = await updateProfileAction({ name, phone: phone.trim() || null })
    setProfileSaving(false)
    setProfileMsg(result.ok ? { ok: true, text: 'Profile saved' } : { ok: false, text: result.error ?? 'Failed' })
    if (result.ok) startTransition(() => router.refresh())
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'New password and confirmation do not match' })
      return
    }
    setPwSaving(true)
    const result = await changePasswordAction({ currentPassword, newPassword })
    setPwSaving(false)
    if (!result.ok) {
      setPwMsg({ ok: false, text: result.error ?? 'Failed to change password' })
      return
    }
    setPwMsg({ ok: true, text: 'Password changed. Other devices signed out.' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    startTransition(() => router.refresh())
  }

  const handleSignOutAll = async () => {
    setSessionMsg(null)
    setSigningOutAll(true)
    const result = await signOutAllAction()
    setSigningOutAll(false)
    setSessionMsg(result.ok
      ? { ok: true, text: `Signed out ${result.revoked ?? 0} other session${result.revoked === 1 ? '' : 's'}` }
      : { ok: false, text: result.error ?? 'Failed' })
    if (result.ok) startTransition(() => router.refresh())
  }

  const handleRevoke = async (sessionId: string) => {
    setSessionMsg(null)
    setRevoking(sessionId)
    const result = await revokeSessionAction(sessionId)
    setRevoking(null)
    setSessionMsg(result.ok ? { ok: true, text: 'Session revoked' } : { ok: false, text: result.error ?? 'Failed' })
    if (result.ok) startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-ink)' }}>Account</h1>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
          Your profile, password, and active sessions.
        </p>
      </div>

      {/* Profile */}
      <Card title="Profile">
        <form onSubmit={handleProfileSave} className="flex flex-col gap-3">
          <ReadOnlyRow label="Email" value={me.email} />
          <ReadOnlyRow label="Role" value={ROLE_LABEL[me.role] ?? me.role} />
          <FieldRow label="Display name" htmlFor="m-name">
            <input
              id="m-name" type="text" value={name} required maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </FieldRow>
          <FieldRow label="Phone" htmlFor="m-phone">
            <input
              id="m-phone" type="tel" value={phone} placeholder="+27 …"
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </FieldRow>
          {profileMsg && <InlineMsg msg={profileMsg} />}
          <button
            type="submit" disabled={profileSaving}
            className="h-11 rounded-lg text-[14px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
          >
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
          <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
            Last sign-in: {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : 'never'}
          </p>
        </form>
      </Card>

      {/* Password */}
      <Card title="Password" icon={<Shield size={14} />}>
        <p className="mb-3 text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
          Minimum 10 characters with at least one letter and one digit. Changing your password signs out every other device.
        </p>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-3">
          <FieldRow label="Current password" htmlFor="m-pw-current">
            <input
              id="m-pw-current" type="password" autoComplete="current-password" required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </FieldRow>
          <FieldRow label="New password" htmlFor="m-pw-new">
            <input
              id="m-pw-new" type="password" autoComplete="new-password" required minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </FieldRow>
          <FieldRow label="Confirm new password" htmlFor="m-pw-confirm">
            <input
              id="m-pw-confirm" type="password" autoComplete="new-password" required minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-[15px] outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}
            />
          </FieldRow>
          {pwMsg && <InlineMsg msg={pwMsg} />}
          <button
            type="submit" disabled={pwSaving}
            className="h-11 rounded-lg text-[14px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
          >
            {pwSaving ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </Card>

      {/* Sessions */}
      <Card
        title="Active sessions"
        icon={<Monitor size={14} />}
        right={sessions.length > 1 ? (
          <button
            type="button" onClick={handleSignOutAll} disabled={signingOutAll}
            className="h-8 px-3 rounded-md text-[12px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink-2)' }}
          >
            {signingOutAll ? '…' : 'Out everywhere'}
          </button>
        ) : null}
      >
        <div className="flex flex-col" style={{ marginInline: '-12px' }}>
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 py-3"
              style={{ paddingInline: 12, borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Monitor size={13} style={{ color: 'var(--color-ink-3)' }} />
                  <span className="text-[13.5px] font-medium" style={{ color: 'var(--color-ink)' }}>
                    {summariseUserAgent(s.userAgent)}
                  </span>
                  {s.current && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[.05em]"
                      style={{ background: 'rgba(52, 211, 153, 0.16)', color: 'var(--color-pos)' }}
                    >
                      This device
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                  {s.ipAddress && (
                    <span className="inline-flex items-center gap-1"><MapPin size={10} />{s.ipAddress}</span>
                  )}
                  <span className="inline-flex items-center gap-1"><Clock size={10} />{timeAgo(s.lastSeenAt)}</span>
                </div>
              </div>
              {!s.current && (
                <button
                  type="button" onClick={() => handleRevoke(s.id)} disabled={revoking === s.id}
                  className="h-8 px-2.5 rounded-md text-[11.5px] disabled:opacity-60"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink-2)' }}
                >
                  <LogOut size={11} className="mr-1 inline" />
                  {revoking === s.id ? '…' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
        {sessionMsg && <div className="mt-3"><InlineMsg msg={sessionMsg} /></div>}
      </Card>
    </div>
  )
}

function Card({ title, icon, right, children }: { title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>
          {icon}
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  )
}

function FieldRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[10.5px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-semibold uppercase tracking-[.06em]" style={{ color: 'var(--color-ink-3)' }}>{label}</span>
      <div
        className="w-full h-11 px-3 rounded-lg flex items-center text-[14px]"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-ink-2)' }}
      >
        {value}
      </div>
    </div>
  )
}

function InlineMsg({ msg }: { msg: { ok: boolean; text: string } }) {
  const Icon = msg.ok ? CheckCircle2 : AlertTriangle
  return (
    <div
      role="alert"
      className="rounded-lg px-3 py-2 text-[12.5px] flex items-center gap-2"
      style={msg.ok
        ? { background: 'rgba(52, 211, 153, 0.10)', color: 'var(--color-pos)' }
        : { background: 'rgba(248, 113, 113, 0.10)', color: 'var(--color-bad)' }
      }
    >
      <Icon size={14} />
      {msg.text}
    </div>
  )
}
