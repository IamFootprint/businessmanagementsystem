import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the whatsapp module before importing notifications
vi.mock('../src/lib/whatsapp', () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
}))

import { sendImportCompleteNotification, sendCloseReminderNotification, sendStaleReceiptNotification } from '../src/lib/notifications'
import { sendTextMessage } from '../src/lib/whatsapp'

const MOCK_PHONE = '+27821234567'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendImportCompleteNotification', () => {
  it('calls sendTextMessage with correct recipient and message', async () => {
    await sendImportCompleteNotification(MOCK_PHONE, { rowCount: 42, duplicateCount: 3 })
    expect(sendTextMessage).toHaveBeenCalledOnce()
    const [to, body] = (sendTextMessage as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(to).toBe(MOCK_PHONE)
    expect(body).toContain('42')
    expect(body).toContain('3')
    expect(body).toContain('Import complete')
  })
})

describe('sendCloseReminderNotification', () => {
  it('calls sendTextMessage with business name, month, year', async () => {
    await sendCloseReminderNotification(MOCK_PHONE, { businessName: 'Kgolaentle Ltd', month: 'March', year: 2024 })
    expect(sendTextMessage).toHaveBeenCalledOnce()
    const [to, body] = (sendTextMessage as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(to).toBe(MOCK_PHONE)
    expect(body).toContain('Kgolaentle Ltd')
    expect(body).toContain('March')
    expect(body).toContain('2024')
  })
})

describe('sendStaleReceiptNotification', () => {
  it('calls sendTextMessage with stale count', async () => {
    await sendStaleReceiptNotification(MOCK_PHONE, { count: 7 })
    expect(sendTextMessage).toHaveBeenCalledOnce()
    const [to, body] = (sendTextMessage as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(to).toBe(MOCK_PHONE)
    expect(body).toContain('7')
  })
})
