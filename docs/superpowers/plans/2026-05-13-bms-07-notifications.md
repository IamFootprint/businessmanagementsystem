# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp notifications via Meta Cloud API for three triggers: statement import complete, month-close reminder (open periods older than 25 days), and stale receipt alert (receipts marked stale in a period). A `/notify` endpoint triggers these manually in tests; a future cron can call them.

**Architecture:** A thin `whatsapp.ts` client wraps the Meta Cloud API. Three notification functions compose message templates. A `/notify` endpoint exposes each trigger. No persistent notification log in MVP — fire-and-forget with error logging.

**Tech Stack:** Hono 4, Prisma 6, `node-fetch` (built-in with Node 18+ global fetch), Vitest, Meta WhatsApp Cloud API

---

## File Structure

| File | Purpose |
|------|---------|
| `apps/api/src/lib/whatsapp.ts` | WhatsApp Cloud API client: `sendTextMessage(to, body)` |
| `apps/api/src/lib/notifications.ts` | Three notification composers using the WhatsApp client |
| `apps/api/src/controllers/notify.controller.ts` | `/notify/import`, `/notify/close-reminder`, `/notify/stale-receipts` |
| `apps/api/src/routes/notify.routes.ts` | Route registration |
| `apps/api/src/routes/index.ts` | ← add `registerNotifyRoutes` |
| `apps/api/__tests__/notifications.test.ts` | Unit tests for notification composers (mock WhatsApp client) |

---

### Task 1: WhatsApp client and notification composers

**Files:**
- Create: `apps/api/src/lib/whatsapp.ts`
- Create: `apps/api/src/lib/notifications.ts`

**Environment variables:**
- `WHATSAPP_PHONE_NUMBER_ID` — the Meta phone number ID
- `WHATSAPP_ACCESS_TOKEN` — the permanent or temp token
- `WHATSAPP_API_VERSION` — default `v19.0`

**WhatsApp client:** Sends a simple text message via Meta's Cloud API.

**Notification triggers:**

1. **Import complete** — called after a successful import. Message: `"✅ Import complete: {rowCount} transactions imported ({duplicateCount} duplicates skipped). Review pending transactions at your BMS dashboard."`

2. **Close reminder** — called for each OPEN period older than 25 days in the current month. Message: `"⏰ Month-close reminder: {month} {year} period for {businessName} is still open. Please review and lock it before end of month."`

3. **Stale receipts** — called when stale receipts exist. Message: `"⚠️ {count} receipt(s) have been unmatched for 90+ days. Please review them in the BMS receipt inbox."`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/__tests__/notifications.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm vitest run __tests__/notifications.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Write the WhatsApp client**

```typescript
// apps/api/src/lib/whatsapp.ts

export type WhatsAppMessage = {
  to: string
  body: string
}

export async function sendTextMessage(to: string, body: string): Promise<{ success: boolean }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v19.0'

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — skipping send')
    return { success: false }
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error(`[whatsapp] Send failed: ${res.status} ${error}`)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('[whatsapp] Network error:', err)
    return { success: false }
  }
}
```

- [ ] **Step 4: Write the notification composers**

```typescript
// apps/api/src/lib/notifications.ts
import { sendTextMessage } from './whatsapp'

export async function sendImportCompleteNotification(
  to: string,
  data: { rowCount: number; duplicateCount: number }
): Promise<void> {
  const body =
    `✅ Import complete: ${data.rowCount} transactions imported` +
    ` (${data.duplicateCount} duplicates skipped).` +
    ` Review pending transactions at your BMS dashboard.`
  await sendTextMessage(to, body)
}

export async function sendCloseReminderNotification(
  to: string,
  data: { businessName: string; month: string; year: number }
): Promise<void> {
  const body =
    `⏰ Month-close reminder: ${data.month} ${data.year} period` +
    ` for ${data.businessName} is still open.` +
    ` Please review and lock it before end of month.`
  await sendTextMessage(to, body)
}

export async function sendStaleReceiptNotification(
  to: string,
  data: { count: number }
): Promise<void> {
  const body =
    `⚠️ ${data.count} receipt(s) have been unmatched for 90+ days.` +
    ` Please review them in the BMS receipt inbox.`
  await sendTextMessage(to, body)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && pnpm vitest run __tests__/notifications.test.ts
```

Expected: 3/3 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/whatsapp.ts apps/api/src/lib/notifications.ts apps/api/__tests__/notifications.test.ts
git commit -m "feat(notifications): WhatsApp client and notification composers"
```

---

### Task 2: Notify controller and routes

**Files:**
- Create: `apps/api/src/controllers/notify.controller.ts`
- Create: `apps/api/src/routes/notify.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

**Endpoints:**

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/notify/import` | session | FINANCE_MANAGER+ | Send import-complete notification. Body: `{ phone, rowCount, duplicateCount }` |
| POST | `/notify/close-reminder` | session | FINANCE_MANAGER+ | Find all OPEN periods older than 25 days for a business, send reminder. Body: `{ phone, businessId }` |
| POST | `/notify/stale-receipts` | session | FINANCE_MANAGER+ | Count stale receipts, send alert if count > 0. Body: `{ phone }` |

All three endpoints return `{ sent: boolean, message?: string }`.

**Close reminder logic:** Find `MonthlyPeriod` records where `status = 'OPEN'` AND `createdAt < (now - 25 days)`. For each, fetch the business name and send the notification.

**Stale receipts logic:** `prisma.receipt.count({ where: { isStale: true } })`. If count > 0, send notification.

- [ ] **Step 1: Write the controller**

```typescript
// apps/api/src/controllers/notify.controller.ts
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '@bms/db'
import {
  sendImportCompleteNotification,
  sendCloseReminderNotification,
  sendStaleReceiptNotification,
} from '../lib/notifications'

const FINANCE_ROLES = ['TENANT_OWNER', 'FINANCE_MANAGER']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const REMINDER_THRESHOLD_MS = 25 * 24 * 60 * 60 * 1000

export async function notifyImportComplete(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  let body: { phone?: string; rowCount?: number; duplicateCount?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { phone, rowCount, duplicateCount } = body
  if (!phone || rowCount === undefined || duplicateCount === undefined) {
    return c.json({ error: 'phone, rowCount, duplicateCount required' }, 400)
  }

  try {
    await sendImportCompleteNotification(phone, { rowCount, duplicateCount })
    return c.json({ sent: true })
  } catch {
    return c.json({ sent: false, message: 'Notification failed' })
  }
}

export async function notifyCloseReminder(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  let body: { phone?: string; businessId?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { phone, businessId } = body
  if (!phone || !businessId) return c.json({ error: 'phone and businessId required' }, 400)

  try {
    const cutoff = new Date(Date.now() - REMINDER_THRESHOLD_MS)
    const openPeriods = await prisma.monthlyPeriod.findMany({
      where: { businessId, status: 'OPEN', createdAt: { lt: cutoff } },
      include: { business: true },
    })

    if (openPeriods.length === 0) {
      return c.json({ sent: false, message: 'No periods need reminders' })
    }

    for (const period of openPeriods) {
      await sendCloseReminderNotification(phone, {
        businessName: period.business.name,
        month: MONTHS[period.month - 1],
        year: period.year,
      })
    }

    return c.json({ sent: true, message: `Sent ${openPeriods.length} reminder(s)` })
  } catch {
    return c.json({ sent: false, message: 'Notification failed' })
  }
}

export async function notifyStaleReceipts(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!FINANCE_ROLES.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)

  let body: { phone?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { phone } = body
  if (!phone) return c.json({ error: 'phone required' }, 400)

  try {
    const count = await prisma.receipt.count({ where: { isStale: true } })
    if (count === 0) return c.json({ sent: false, message: 'No stale receipts' })

    await sendStaleReceiptNotification(phone, { count })
    return c.json({ sent: true })
  } catch {
    return c.json({ sent: false, message: 'Notification failed' })
  }
}
```

- [ ] **Step 2: Write the routes file**

```typescript
// apps/api/src/routes/notify.routes.ts
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import {
  notifyImportComplete,
  notifyCloseReminder,
  notifyStaleReceipts,
} from '../controllers/notify.controller'

export function registerNotifyRoutes(app: Hono<AppEnv>) {
  app.post('/notify/import', sessionMiddleware, notifyImportComplete)
  app.post('/notify/close-reminder', sessionMiddleware, notifyCloseReminder)
  app.post('/notify/stale-receipts', sessionMiddleware, notifyStaleReceipts)
}
```

- [ ] **Step 3: Register in routes/index.ts**

Add to `apps/api/src/routes/index.ts`:
```typescript
import { registerNotifyRoutes } from './notify.routes'
// inside registerRoutes():
registerNotifyRoutes(app)
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/notify.controller.ts \
        apps/api/src/routes/notify.routes.ts \
        apps/api/src/routes/index.ts
git commit -m "feat(notifications): notify endpoints for import, close-reminder, and stale-receipts"
```

---

## Test count summary

| Plan | Tests added |
|------|------------|
| After Plan 6 | ~79 |
| Plan 7 Task 1 | +3 (notification composer unit tests) |
| **After Plan 7** | **~82** |

Note: Task 2 endpoints are covered by smoke tests (401 enforcement, role guard) but no dedicated integration tests since they call an external API. The notification composers are the unit under test.
