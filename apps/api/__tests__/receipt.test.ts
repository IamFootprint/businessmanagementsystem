import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../src/app'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../src/lib/password'

const app = createApp()

const TEST_EMAIL = `receipt-tester-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'ReceiptPass123!'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Mar 2024,OPENING BALANCE,,100000.00
10 Mar 2024,PICK N PAY STORES 001,-125.00,99875.00
`

let tenantId: string
let bankAccountId: string
let sessionToken: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Receipt Test Tenant', slug: `receipt-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const bankAccount = await prisma.bankAccount.create({
    data: { tenantId, nickname: 'Receipt Bank', bankName: 'Standard Bank', accountType: 'Business Cheque' },
  })
  bankAccountId = bankAccount.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Receipt Manager',
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

  // Import CSV to create transactions
  const fd = new FormData()
  fd.append('file', new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'receipt-test.csv')
  fd.append('bankAccountId', bankAccountId)
  await app.request('/imports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: fd,
  })
})

afterAll(async () => {
  if (tenantId) {
    await prisma.receipt.deleteMany({ where: { uploaderPhone: '+27-receipt-test' } })
    const importIds = await prisma.statementImport
      .findMany({ where: { bankAccountId }, select: { id: true } })
      .then((r) => r.map((x) => x.id))
    await prisma.statementImportRow.deleteMany({ where: { importId: { in: importIds } } })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
    await prisma.session.deleteMany({ where: { user: { tenantId } } })
    await prisma.user.deleteMany({ where: { tenantId } })
    await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

describe('GET /receipts', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/receipts')
    expect(res.status).toBe(401)
  })

  it('returns empty list initially', async () => {
    const res = await app.request('/receipts', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { receipts: unknown[] }
    expect(Array.isArray(body.receipts)).toBe(true)
  })
})

describe('POST /receipts/:id/match', () => {
  it('returns 404 for unknown receipt', async () => {
    const res = await app.request('/receipts/nonexistent/match', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /receipts/mark-stale', () => {
  it('returns count of receipts marked stale', async () => {
    const res = await app.request('/receipts/mark-stale', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { marked: number }
    expect(typeof body.marked).toBe('number')
  })
})

describe('POST /receipts/public', () => {
  it('returns 400 when file is missing', async () => {
    const fd = new FormData()
    fd.append('phone', '+27-receipt-test')
    const res = await app.request('/receipts/public', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone is missing', async () => {
    const fd = new FormData()
    fd.append('file', new Blob(['fake'], { type: 'image/jpeg' }), 'test.jpg')
    const res = await app.request('/receipts/public', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
  })

  it('returns 500 when BLOB_READ_WRITE_TOKEN is not set', async () => {
    const original = process.env.BLOB_READ_WRITE_TOKEN
    delete process.env.BLOB_READ_WRITE_TOKEN
    const fd = new FormData()
    fd.append('file', new Blob(['fake'], { type: 'image/jpeg' }), 'test.jpg')
    fd.append('phone', '+27-receipt-test')
    const res = await app.request('/receipts/public', { method: 'POST', body: fd })
    expect(res.status).toBe(500)
    process.env.BLOB_READ_WRITE_TOKEN = original
  })
})
