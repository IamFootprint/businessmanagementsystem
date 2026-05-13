import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../lib/password'
import { createApp } from '../app'

const app = createApp()

const TEST_EMAIL = `importer-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'ImportPass123!'

const SAMPLE_CSV = `Date,Description,Amount,Balance
01 Apr 2025,OPENING BALANCE,,45000.00
02 Apr 2025,"CAPITEC BANK,12345678, REF:AB12CD",-1234.56,43765.44
03 Apr 2025,SALARY PAYMENT,50000.00,93765.44
04 Apr 2025,ATM WITHDRAWAL,-500.00,93265.44
`

let tenantId: string
let userId: string
let bankAccountId: string
let sessionToken: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Import Test Tenant', slug: `import-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const bankAccount = await prisma.bankAccount.create({
    data: {
      tenantId,
      nickname: 'Test Standard Bank',
      bankName: 'Standard Bank',
      accountType: 'Business Cheque',
    },
  })
  bankAccountId = bankAccount.id

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

  // Login to get a session token
  const loginRes = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const loginBody = await loginRes.json()
  sessionToken = loginBody.token
})

afterAll(async () => {
  if (tenantId) {
    // Clean up import rows first via importId list
    const imports = await prisma.statementImport.findMany({
      where: { bankAccountId },
      select: { id: true },
    })
    const importIds = imports.map((x) => x.id)

    await prisma.statementImportRow.deleteMany({
      where: { importId: { in: importIds } },
    })
    await prisma.transaction.deleteMany({ where: { bankAccountId } })
    await prisma.statementImport.deleteMany({ where: { bankAccountId } })
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.bankAccount.deleteMany({ where: { id: bankAccountId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

function makeFormData(csv: string, baid: string): FormData {
  const fd = new FormData()
  fd.append('file', new Blob([csv], { type: 'text/csv' }), 'statement.csv')
  fd.append('bankAccountId', baid)
  return fd
}

describe('POST /imports', () => {
  it('returns 401 with no auth', async () => {
    const res = await app.request('/imports', {
      method: 'POST',
      body: makeFormData(SAMPLE_CSV, bankAccountId),
    })
    expect(res.status).toBe(401)
  })

  it('returns 201 with import summary on valid CSV', async () => {
    const fd = makeFormData(SAMPLE_CSV, bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.rowCount).toBe(3)
    expect(body.importedCount).toBe(3)
    expect(body.duplicateCount).toBe(0)
    expect(body.errorCount).toBe(0)
    expect(typeof body.importId).toBe('string')
  })

  it('returns duplicate count on re-import of same file', async () => {
    const fd = makeFormData(SAMPLE_CSV, bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.importedCount).toBe(0)
    expect(body.duplicateCount).toBe(3)
  })

  it('returns 422 for CSV with no transaction rows', async () => {
    const fd = new FormData()
    fd.append('file', new Blob(['Date,Description,Amount,Balance\n'], { type: 'text/csv' }), 'empty.csv')
    fd.append('bankAccountId', bankAccountId)
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(422)
  })

  it('returns 400 when bankAccountId is missing', async () => {
    const fd = new FormData()
    fd.append('file', new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'statement.csv')
    const res = await app.request('/imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: fd,
    })
    expect(res.status).toBe(400)
  })
})
