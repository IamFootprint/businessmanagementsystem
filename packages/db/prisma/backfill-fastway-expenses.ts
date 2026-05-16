/**
 * One-time backfill: assign businessId=fastway to reviewed expense transactions
 * whose descriptions match Fastway fuel / vehicle / insurance / compliance rules.
 *
 * Run: pnpm --filter @bms/db tsx prisma/backfill-fastway-expenses.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FASTWAY_EXPENSE_PATTERNS = [
  'GLOBAL TLAYANG',
  'GLOBAL BOIKHUTSO',
  'RIVER SERVICE STATION',
  'ENGEN MANKWE',
  'ENGEN SUN CITY',
  'SHALOM PETRO',
  'OBARO RUSTENBURG',
  'DIE KRAAL FILLING',
  'PILANESBURG MOTORS',
  'CNN KOREAN',
  'GLASFIT',
  'BDG/BUSINS819045252',
  'RTMC',
]

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
  const fastway = await prisma.business.findFirstOrThrow({
    where: { tenantId: tenant.id, slug: 'fastway' },
    select: { id: true, name: true },
  })
  console.log(`Tenant: ${tenant.name}`)
  console.log(`Fastway business ID: ${fastway.id} (${fastway.name})`)

  const bankAccountIds = (
    await prisma.bankAccount.findMany({ where: { tenantId: tenant.id }, select: { id: true } })
  ).map((b) => b.id)

  // Fetch all DEBIT transactions not yet assigned to Fastway
  const transactions = await prisma.transaction.findMany({
    where: {
      bankAccountId: { in: bankAccountIds },
      direction: 'DEBIT',
      businessId: null,
    },
    select: { id: true, cleanDescription: true },
  })

  console.log(`\nDEBIT transactions with no business assignment: ${transactions.length}`)

  const toUpdate: string[] = []
  for (const tx of transactions) {
    const desc = (tx.cleanDescription ?? '').toUpperCase()
    if (FASTWAY_EXPENSE_PATTERNS.some((p) => desc.includes(p))) {
      toUpdate.push(tx.id)
    }
  }

  console.log(`Matching Fastway expense patterns: ${toUpdate.length}`)
  if (toUpdate.length === 0) {
    console.log('Nothing to update.')
    return
  }

  // Show sample
  const sample = transactions
    .filter((t) => toUpdate.includes(t.id))
    .slice(0, 10)
    .map((t) => `  ${t.cleanDescription}`)
    .join('\n')
  console.log(`\nSample (up to 10):\n${sample}`)

  const { count } = await prisma.transaction.updateMany({
    where: { id: { in: toUpdate } },
    data: { businessId: fastway.id },
  })

  console.log(`\n✓ Updated ${count} transactions → businessId = ${fastway.id}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
