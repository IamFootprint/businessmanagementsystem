import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isFeatureEnabled, isKillSwitchActive, invalidateFlagCache, KILL_SWITCHES } from '../feature-flags'

vi.mock('../../prisma', () => ({
  prisma: {
    featureFlag: {
      findUnique: vi.fn()
    }
  }
}))

import { prisma } from '../../prisma'

describe('feature-flags (unit, no DB)', () => {
  it('KILL_SWITCHES exports known switch names', () => {
    expect(KILL_SWITCHES.OTP_AUTH).toBe('kill.otp_auth')
    expect(KILL_SWITCHES.PUBLIC_BOOKING).toBe('kill.public_booking')
    expect(KILL_SWITCHES.CHAT).toBe('kill.chat')
  })

  it('isFeatureEnabled — returns false for unknown flag when default is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce(null)
    const result = await isFeatureEnabled('nonexistent.flag', false)
    expect(result).toBe(false)
  })

  it('isFeatureEnabled — returns true for unknown flag when default is true', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce(null)
    const result = await isFeatureEnabled('nonexistent.flag.true', true)
    expect(result).toBe(true)
  })

  it('isKillSwitchActive — returns false by default (kill switches default off)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce(null)
    const result = await isKillSwitchActive(KILL_SWITCHES.OTP_AUTH)
    expect(result).toBe(false)
  })
})

describe('feature-flags — cache behaviour', () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findUnique).mockReset()
    // Clear cache entries used across these tests
    invalidateFlagCache('test.flag')
    invalidateFlagCache('cached.flag')
    invalidateFlagCache('inv.flag')
  })

  it('returns DB value when flag exists', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce({
      id: 'test-id',
      name: 'test.flag',
      enabled: true,
      description: null,
      updatedAt: new Date(),
      updatedBy: null
    })
    const result = await isFeatureEnabled('test.flag', false)
    expect(result).toBe(true)
  })

  it('caches result — second call does not hit DB', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce({
      id: 'test-id',
      name: 'cached.flag',
      enabled: true,
      description: null,
      updatedAt: new Date(),
      updatedBy: null
    })
    await isFeatureEnabled('cached.flag', false) // first call — hits DB
    await isFeatureEnabled('cached.flag', false) // second call — should hit cache
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1)
  })

  it('invalidateFlagCache clears cache entry — next call hits DB again', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      id: 'test-id',
      name: 'inv.flag',
      enabled: true,
      description: null,
      updatedAt: new Date(),
      updatedBy: null
    })
    await isFeatureEnabled('inv.flag', false) // populate cache
    invalidateFlagCache('inv.flag')
    await isFeatureEnabled('inv.flag', false) // should hit DB again
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(2)
  })
})
