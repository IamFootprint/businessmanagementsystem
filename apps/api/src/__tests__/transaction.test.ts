import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../lib/password'
import { createApp } from '../app'

const app = createApp()

const TEST_EMAIL = `reviewer-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'ReviewPass123!'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Apr 2025,OPENING BALANCE,,45000.00
02 Apr 2025,CHECKERS SUPERMARKET,-500.00,44500.00
03 Apr 2025,SALARY CREDIT,50000.00,94500.00
`

let tenantId: string
let userId: string
let bankAccountId: string
let categoryId: string
let sessionToken: string
let transactionId: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Review Test Tenant', slug: `review-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const bankAccount = await prisma.bankAccount.create({
    data: { tenantId, nickname: 'Test Bank', bankName: 'Standard Bank', accountType: 'Business Cheque' },
  })
  bankAccountId = bankAccount.id

  const category = await prisma.category.create({
    data: { tenantId, categoryType: 'EXPENSE', name: `Groceries-${Date.now()}`, receiptRequired: false },
  })
  categoryId = category.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Finance Manager',
      role: UserRole.FINANCE_MANAGER,
    },
  })
  userId = user.id

  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const { token } = await loginRes.json()
  sessionToken = token

  // Import CSV to create transactions
  const fd = new FormData()
  fd.append('file', new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'test.csv')
  fd.append('bankAccountId', bankAccountId)
  await app.request('/imports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: fd,
  })

  // Get earliest transaction ID
  const txn = await prisma.transaction.findFirst({
    where: { bankAccountId },
    orderBy: { transactionDate: 'asc' },
  })
  transactionId = txn!.id
})

afterAll(async () => {
  if (tenantId) {
    const importIds = await prisma.statementImport
      .findMany({ where: { bankAccountId }, select: { id: true } })
      .then(r => r.map(x => x.id))
    await prisma.statementImportRow.deleteMany({ where: { importId: { in: importIds } } })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
    await prisma.category.deleteMany({ where: { id: categoryId } })
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

describe('GET /transactions', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/transactions')
    expect(res.status).toBe(401)
  })

  it('returns paginated transactions for the tenant', async () => {
    const res = await app.request('/transactions', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta.total).toBeGreaterThan(0)
    expect(body.data[0]).toHaveProperty('bankAccount')
  })

  it('filters by reviewStatus', async () => {
    const res = await app.request('/transactions?reviewStatus=NEEDS_REVIEW', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.every((t: { reviewStatus: string }) => t.reviewStatus === 'NEEDS_REVIEW')).toBe(true)
  })
})

describe('PATCH /transactions/:id', () => {
  it('categorises a transaction and marks it REVIEWED', async () => {
    const res = await app.request(`/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId, reviewStatus: 'REVIEWED' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.categoryId).toBe(categoryId)
    expect(body.reviewStatus).toBe('REVIEWED')
  })

  it('returns 404 for non-existent transaction', async () => {
    const res = await app.request('/transactions/non-existent-id', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId }),
    })
    expect(res.status).toBe(404)
  })
})

describe('PATCH /transactions (bulk)', () => {
  it('bulk-categorises multiple transactions', async () => {
    const txns = await prisma.transaction.findMany({ where: { bankAccountId } })
    const ids = txns.map(t => t.id)

    const res = await app.request('/transactions', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, categoryId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(ids.length)
  })

  it('returns 400 when ids array is missing', async () => {
    const res = await app.request('/transactions', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryId }),
    })
    expect(res.status).toBe(400)
  })
})
