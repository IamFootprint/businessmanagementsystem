import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma, UserRole } from '@bms/db'
import { hashPassword } from '../lib/password'
import { createApp } from '../app'

const app = createApp()

const TEST_EMAIL = `owner-test-${Date.now()}@kgolaentle.com`
const TEST_PASSWORD = 'TestPass123!'

let tenantId: string
let userId: string

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: 'Auth Test Tenant', slug: `auth-test-${Date.now()}` },
  })
  tenantId = tenant.id

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PASSWORD),
      name: 'Test Owner',
      role: UserRole.TENANT_OWNER,
    },
  })
  userId = user.id
})

afterAll(async () => {
  if (userId) {
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
  }
  if (tenantId) {
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  }
  await prisma.$disconnect()
})

describe('POST /auth/login', () => {
  it('returns 200 with token on valid credentials', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(0)
    expect(body.user.email).toBe(TEST_EMAIL)
    expect(body.user.role).toBe('TENANT_OWNER')
    expect(body.user).not.toHaveProperty('passwordHash')
  })

  it('returns 401 on wrong password', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongpassword' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 on non-@kgolaentle.com email', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@gmail.com', password: TEST_PASSWORD }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when body fields are missing', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/logout', () => {
  it('returns 200 and deletes the session', async () => {
    // Login first to get a token
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    const { token } = await loginRes.json()

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(logoutRes.status).toBe(200)

    // Token should no longer be valid
    const meRes = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(meRes.status).toBe(401)
  })

  it('returns 401 with no Authorization header', async () => {
    const res = await app.request('/auth/logout', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('returns 200 with user info on valid session', async () => {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    const { token } = await loginRes.json()

    const meRes = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(meRes.status).toBe(200)
    const body = await meRes.json()
    expect(body.user.email).toBe(TEST_EMAIL)
    expect(body.user).not.toHaveProperty('passwordHash')
  })

  it('returns 401 with no token', async () => {
    const res = await app.request('/auth/me')
    expect(res.status).toBe(401)
  })
})
