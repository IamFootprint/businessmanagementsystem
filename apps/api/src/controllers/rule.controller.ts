import type { Context } from 'hono'
import { prisma } from '@bms/db'
import type { AppEnv } from '../types'
import { applyRulesToTransactions } from '../lib/rules-engine'
import type { TransactionType } from '@bms/db'

export async function listRules(c: Context<AppEnv>) {
  const user = c.get('user')
  try {
    const rules = await prisma.transactionRule.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: { priority: 'desc' },
    })
    return c.json({ data: rules })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function createRule(c: Context<AppEnv>) {
  const user = c.get('user')
  type CreateRuleBody = {
    name: string
    descriptionPattern: string
    categoryId?: string
    supplierId?: string
    businessId?: string
    transactionType?: TransactionType
    isPersonal?: boolean
    receiptRequired?: boolean
    trustedAutoReview?: boolean
    priority?: number
  }
  const body: CreateRuleBody = await c.req.json<CreateRuleBody>()
    .catch(() => ({ name: '', descriptionPattern: '' } as CreateRuleBody))

  if (!body.name?.trim() || !body.descriptionPattern?.trim()) {
    return c.json({ error: 'name and descriptionPattern are required' }, 400)
  }

  try {
    const rule = await prisma.transactionRule.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        descriptionPattern: body.descriptionPattern.trim().toUpperCase(),
        categoryId: body.categoryId ?? null,
        supplierId: body.supplierId ?? null,
        businessId: body.businessId ?? null,
        transactionType: body.transactionType ?? null,
        isPersonal: body.isPersonal ?? null,
        receiptRequired: body.receiptRequired ?? null,
        trustedAutoReview: body.trustedAutoReview ?? false,
        priority: body.priority ?? 0,
      },
    })
    return c.json(rule, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function updateRule(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const existing = await prisma.transactionRule.findFirst({
    where: { id, tenantId: user.tenantId },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  type UpdateBody = {
    name?: string
    descriptionPattern?: string
    categoryId?: string | null
    supplierId?: string | null
    businessId?: string | null
    transactionType?: string | null
    isPersonal?: boolean | null
    receiptRequired?: boolean | null
    trustedAutoReview?: boolean
    priority?: number
    active?: boolean
  }
  const body: UpdateBody = await c.req.json<UpdateBody>().catch(() => ({}))

  try {
    const updated = await prisma.transactionRule.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.descriptionPattern?.trim()
          ? { descriptionPattern: body.descriptionPattern.trim().toUpperCase() }
          : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId } : {}),
        ...(body.businessId !== undefined ? { businessId: body.businessId } : {}),
        ...(body.transactionType !== undefined ? { transactionType: body.transactionType } : {}),
        ...(body.isPersonal !== undefined ? { isPersonal: body.isPersonal } : {}),
        ...(body.receiptRequired !== undefined ? { receiptRequired: body.receiptRequired } : {}),
        ...(body.trustedAutoReview !== undefined ? { trustedAutoReview: body.trustedAutoReview } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    })
    return c.json(updated)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function deleteRule(c: Context<AppEnv>) {
  const user = c.get('user')
  const { id } = c.req.param()

  const existing = await prisma.transactionRule.findFirst({
    where: { id, tenantId: user.tenantId },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.transactionRule.update({ where: { id }, data: { active: false } })
  return c.json({ ok: true })
}

export async function applyRules(c: Context<AppEnv>) {
  const user = c.get('user')

  const rules = await prisma.transactionRule.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) {
    return c.json({ applied: 0, message: 'No active rules' })
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      bankAccount: { tenantId: user.tenantId },
      reviewStatus: 'NEEDS_REVIEW',
    },
    select: {
      id: true,
      cleanDescription: true,
      reviewStatus: true,
      categoryId: true,
      supplierId: true,
      businessId: true,
      transactionType: true,
      isPersonal: true,
    },
  })

  const matches = applyRulesToTransactions(transactions, rules)
  if (matches.length === 0) return c.json({ applied: 0 })

  let applied = 0
  const BATCH_SIZE = 50
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((match) =>
        prisma.transaction.update({
          where: { id: match.transactionId },
          data: {
            ruleId: match.ruleId,
            ...(match.categoryId !== null ? { categoryId: match.categoryId } : {}),
            ...(match.supplierId !== null ? { supplierId: match.supplierId } : {}),
            ...(match.businessId !== null ? { businessId: match.businessId } : {}),
            ...(match.transactionType !== null ? { transactionType: match.transactionType } : {}),
            ...(match.isPersonal !== null ? { isPersonal: match.isPersonal } : {}),
            reviewStatus: match.reviewStatus,
            ...(match.reviewStatus === 'REVIEWED'
              ? { reviewedById: user.id, reviewedAt: new Date() }
              : {}),
          },
        })
      )
    )
    applied += results.filter((r) => r.status === 'fulfilled').length
  }

  return c.json({ applied })
}
