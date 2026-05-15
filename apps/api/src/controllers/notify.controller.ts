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
    const result = await sendImportCompleteNotification(phone, { rowCount, duplicateCount })
    return c.json({ sent: result.success })
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
    const ownedBusiness = await prisma.business.findFirst({ where: { id: businessId, tenantId: user.tenantId } })
    if (!ownedBusiness) return c.json({ error: 'Business not found' }, 404)

    const cutoff = new Date(Date.now() - REMINDER_THRESHOLD_MS)
    const openPeriods = await prisma.monthlyPeriod.findMany({
      where: { businessId, status: 'OPEN', createdAt: { lt: cutoff } },
      include: { business: true },
    })

    if (openPeriods.length === 0) {
      return c.json({ sent: false, message: 'No periods need reminders' })
    }

    await Promise.allSettled(
      openPeriods.map((period) =>
        sendCloseReminderNotification(phone, {
          businessName: period.business.name,
          month: MONTHS[period.month - 1],
          year: period.year,
        })
      )
    )

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
    const tenantBusinessIds = (
      await prisma.business.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })
    ).map((b) => b.id)
    const count = await prisma.receipt.count({ where: { isStale: true, hintBusinessId: { in: tenantBusinessIds } } })
    if (count === 0) return c.json({ sent: false, message: 'No stale receipts' })

    const result = await sendStaleReceiptNotification(phone, { count })
    return c.json({ sent: result.success })
  } catch {
    return c.json({ sent: false, message: 'Notification failed' })
  }
}
