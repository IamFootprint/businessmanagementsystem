import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../src/app'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../src/lib/password'

const app = createApp()
const TEST_EMAIL = `period-test-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'PeriodPass123!'

let tenantId: string
let businessId: string
let bankAccountId: string
let sessionToken: string
let periodId: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Period Test Tenant', slug: `period-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const biz = await prisma.business.create({
    data: { tenantId, name: 'Period Biz', slug: 'period-biz' },
  })
  businessId = biz.id

  const ba = await prisma.bankAccount.create({
    data: { tenantId, nickname: 'Period Bank', bankName: 'Standard Bank', accountType: 'Business Cheque' },
  })
  bankAccountId = ba.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Finance Lead',
      role: UserRole.TENANT_OWNER,
    },
  })

  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const { token } = await loginRes.json()
  sessionToken = token
})

afterAll(async () => {
  if (periodId) {
    await prisma.monthlyPeriodEvent.deleteMany({ where: { periodId } })
    await prisma.reportSnapshot.deleteMany({ where: { periodId } })
    await prisma.monthlyPeriod.deleteMany({ where: { id: periodId } })
  }
  if (bankAccountId) {
    const importIds = await prisma.statementImport
      .findMany({ where: { bankAccountId }, select: { id: true } })
      .then((r) => r.map((x) => x.id))
    await prisma.statementImportRow.deleteMany({ where: { importId: { in: importIds } } })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
  }
  await prisma.session.deleteMany({ where: { user: { tenantId } } })
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.business.deleteMany({ where: { id: businessId } })
  await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
  await prisma.tenant.deleteMany({ where: { id: tenantId } })
  await prisma.$disconnect()
})

describe('POST /periods', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a period', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { period: { id: string; status: string } }
    expect(body.period.status).toBe('OPEN')
    periodId = body.period.id
  })

  it('returns same period on duplicate create', async () => {
    const res = await app.request('/periods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, year: 2024, month: 3 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { id: string } }
    expect(body.period.id).toBe(periodId)
  })
})

describe('GET /periods', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request(`/periods?businessId=${businessId}`)
    expect(res.status).toBe(401)
  })

  it('lists periods for a business', async () => {
    const res = await app.request(`/periods?businessId=${businessId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { periods: unknown[] }
    expect(body.periods.length).toBeGreaterThan(0)
  })
})

describe('POST /periods/:id/lock', () => {
  it('locks the period and returns snapshot', async () => {
    const res = await app.request(`/periods/${periodId}/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { status: string }; snapshot: { netProfitCents: number } }
    expect(body.period.status).toBe('LOCKED')
    expect(typeof body.snapshot.netProfitCents).toBe('number')
  })
})

describe('GET /periods/:id/report', () => {
  it('returns the stored snapshot', async () => {
    const res = await app.request(`/periods/${periodId}/report`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { snapshot: { totalRevenueCents: number } }
    expect(typeof body.snapshot.totalRevenueCents).toBe('number')
  })
})

describe('GET /periods/:id/export', () => {
  it('returns CSV content-type', async () => {
    const res = await app.request(`/periods/${periodId}/export`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })
})

describe('POST /periods/:id/unlock', () => {
  it('requires reason', async () => {
    const res = await app.request(`/periods/${periodId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('unlocks the period', async () => {
    const res = await app.request(`/periods/${periodId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Correction needed' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { period: { status: string } }
    expect(body.period.status).toBe('OPEN')
  })
})
