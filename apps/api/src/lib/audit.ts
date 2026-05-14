// apps/api/src/lib/audit.ts
import { prisma } from '@bms/db'

type AuditableFields = {
  categoryId?: string | null
  supplierId?: string | null
  businessId?: string | null
  transactionType?: string | null
  isPersonal?: boolean
  notes?: string | null
  reviewStatus?: string
}

export async function writeAuditEvent(
  transactionId: string,
  actorId: string | null,
  before: AuditableFields,
  after: AuditableFields,
  action: string
): Promise<void> {
  try {
    await prisma.transactionAuditEvent.create({
      data: {
        transactionId,
        actorId,
        action,
        before: before as object,
        after: after as object,
      },
    })
  } catch {
    // Audit failure must never break the main operation
  }
}
