import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL } },
})

afterAll(() => prisma.$disconnect())

describe('seed data', () => {
  it('tenant Kgolaentle Holdings exists', async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'kgolaentle-holdings' } })
    expect(tenant).not.toBeNull()
    expect(tenant?.name).toBe('Kgolaentle Holdings')
  })

  it('four businesses are seeded', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const count = await prisma.business.count({ where: { tenantId: tenant.id } })
    expect(count).toBe(4)
  })

  it('Standard Bank Main account exists', async () => {
    const account = await prisma.bankAccount.findUnique({ where: { id: 'seed-stdbank-main' } })
    expect(account).not.toBeNull()
    expect(account?.bankName).toBe('Standard Bank')
  })

  it('Uncategorised category exists', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const cat = await prisma.category.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Uncategorised' } },
    })
    expect(cat).not.toBeNull()
    expect(cat?.categoryType).toBe('UNKNOWN')
  })

  it('at least one TENANT_OWNER user exists', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'TENANT_OWNER' },
    })
    expect(owner).not.toBeNull()
  })
})
