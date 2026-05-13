import { describe, it, expect } from 'vitest'
import { app } from '../app'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

describe('GET /health/db', () => {
  it('returns 200 when database is reachable', async () => {
    const res = await app.request('/health/db')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.latencyMs).toBe('number')
  })
})
