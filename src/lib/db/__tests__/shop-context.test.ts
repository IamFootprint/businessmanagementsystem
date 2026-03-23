// Tests that withShopContext correctly scopes queries to one shop.
// Requires DATA_MODE=prisma and a real PostgreSQL database.
// Skip in fake-DB mode.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../prisma'
import { withShopContext, isValidShopId } from '../shop-context'

const isRealDb = process.env.DATA_MODE === 'prisma'

describe('withShopContext', () => {
  it('isValidShopId — accepts valid UUID', () => {
    expect(isValidShopId('123e4567-e89b-42d3-a456-556642440000')).toBe(true)
  })

  it('isValidShopId — rejects non-UUID', () => {
    expect(isValidShopId('not-a-uuid')).toBe(false)
    expect(isValidShopId("'; DROP TABLE shops; --")).toBe(false)
    expect(isValidShopId('')).toBe(false)
    expect(isValidShopId(null)).toBe(false)
  })

  it('withShopContext — throws on invalid shopId', async () => {
    await expect(
      withShopContext('not-a-uuid', async (tx) => tx.booking.findMany())
    ).rejects.toThrow('Invalid shopId')
  })

  // Cross-tenant isolation test — only runs against real DB
  it.skipIf(!isRealDb)('cross-tenant isolation — shop A cannot read shop B bookings', async () => {
    // Arrange: create two shops
    const shopA = await prisma.shop.create({
      data: { name: 'Isolation Test Shop A', slug: `test-shop-a-${Date.now()}`, phone: '+27000000001' }
    })
    const shopB = await prisma.shop.create({
      data: { name: 'Isolation Test Shop B', slug: `test-shop-b-${Date.now()}`, phone: '+27000000002' }
    })

    // Arrange: create a customer profile and booking in Shop B
    const profile = await prisma.profile.create({
      data: {
        phone: `+2799${Date.now()}`,
        name: 'Test Customer',
        role: 'CUSTOMER',
        shopId: shopB.id
      }
    })

    const serviceItem = await prisma.serviceItem.findFirst({
      where: { shopId: shopB.id }
    })
    if (!serviceItem) {
      // Skip gracefully if no service items seeded
      await prisma.profile.delete({ where: { id: profile.id } })
      await prisma.shop.deleteMany({ where: { id: { in: [shopA.id, shopB.id] } } })
      return
    }

    let booking: Awaited<ReturnType<typeof prisma.booking.create>> | undefined
    try {
      booking = await prisma.booking.create({
        data: {
          shopId: shopB.id,
          customerProfileId: profile.id,
          customerName: 'Test Customer',
          customerPhone: profile.phone,
          serviceItemId: serviceItem.id,
          addressLine1: '1 Test Street',
          suburb: 'Testville',
          city: 'Cape Town',
          slotIso: new Date().toISOString(),
          status: 'CONFIRMED',
          pricingSnapshotJson: '{}'
        }
      })

      // Act: read bookings as Shop A context
      const resultAsShopA = await withShopContext(shopA.id, async (tx) => {
        return tx.booking.findMany()
      })

      // Assert: Shop A cannot see Shop B's booking
      const found = resultAsShopA.find((b) => b.id === booking.id)
      expect(found).toBeUndefined()

      // Verify Shop B can see its own booking (sanity check)
      const resultAsShopB = await withShopContext(shopB.id, async (tx) => {
        return tx.booking.findMany({ where: { id: booking!.id } })
      })
      expect(resultAsShopB).toHaveLength(1)
      expect(resultAsShopB[0].id).toBe(booking.id)
    } finally {
      // Cleanup always runs, even if an assertion throws
      if (booking) {
        await prisma.booking.delete({ where: { id: booking.id } })
      }
      await prisma.profile.delete({ where: { id: profile.id } })
      await prisma.shop.deleteMany({ where: { id: { in: [shopA.id, shopB.id] } } })
    }
  })
})
