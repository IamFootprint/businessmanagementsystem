import { prisma } from '../prisma'

/**
 * Named kill switches for operational use.
 * Convention: 'kill.<feature>' means "true = feature is DISABLED".
 */
export const KILL_SWITCHES = {
  OTP_AUTH: 'kill.otp_auth',             // Disable OTP login (emergency lockout)
  PUBLIC_BOOKING: 'kill.public_booking', // Disable public booking widget
  CHAT: 'kill.chat',                     // Disable customer chat
  ADMIN_WRITES: 'kill.admin_writes',     // Block all admin mutations (read-only mode)
  NOTIFICATIONS: 'kill.notifications',   // Block email/SMS sending
} as const

export type KillSwitchName = typeof KILL_SWITCHES[keyof typeof KILL_SWITCHES]

// In-memory cache: flag name → { value, expiresAt }
const cache = new Map<string, { value: boolean; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds

/**
 * Check whether a named feature flag is enabled.
 * Returns `defaultValue` if the flag doesn't exist in the DB.
 * Caches results for CACHE_TTL_MS to avoid per-request DB queries.
 */
export async function isFeatureEnabled(
  name: string,
  defaultValue = false
): Promise<boolean> {
  const now = Date.now()
  const cached = cache.get(name)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  try {
    const flag = await prisma.featureFlag.findUnique({ where: { name } })
    const value = flag?.enabled ?? defaultValue
    cache.set(name, { value, expiresAt: now + CACHE_TTL_MS })
    return value
  } catch {
    // DB unavailable — fail open (return default) to avoid blocking all requests
    return defaultValue
  }
}

/**
 * Kill switch check. Returns true if the feature is DISABLED (kill switch active).
 * Kill switches default to false (feature enabled) if not in DB.
 */
export async function isKillSwitchActive(name: KillSwitchName): Promise<boolean> {
  return isFeatureEnabled(name, false)
}

/**
 * Invalidate the in-memory cache for a specific flag (call after admin toggle).
 */
export function invalidateFlagCache(name: string): void {
  cache.delete(name)
}
