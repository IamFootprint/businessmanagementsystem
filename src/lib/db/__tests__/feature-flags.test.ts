import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isFeatureEnabled, isKillSwitchActive, KILL_SWITCHES } from '../feature-flags'

describe('feature-flags (unit, no DB)', () => {
  it('KILL_SWITCHES exports known switch names', () => {
    expect(KILL_SWITCHES.OTP_AUTH).toBe('kill.otp_auth')
    expect(KILL_SWITCHES.PUBLIC_BOOKING).toBe('kill.public_booking')
    expect(KILL_SWITCHES.CHAT).toBe('kill.chat')
  })

  it('isFeatureEnabled — returns false for unknown flag when default is false', async () => {
    // In fake/unit mode, should return the default value
    const result = await isFeatureEnabled('nonexistent.flag', false)
    expect(result).toBe(false)
  })

  it('isFeatureEnabled — returns true for unknown flag when default is true', async () => {
    const result = await isFeatureEnabled('nonexistent.flag', true)
    expect(result).toBe(true)
  })

  it('isKillSwitchActive — returns false by default (kill switches default off)', async () => {
    const result = await isKillSwitchActive(KILL_SWITCHES.OTP_AUTH)
    expect(result).toBe(false)
  })
})
