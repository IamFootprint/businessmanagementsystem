/**
 * seed-rules.ts — CLI entry for seeding transaction rules.
 *
 * Uses local DATABASE_URL from packages/db/.env. For production seeding,
 * use the admin API endpoint (POST /admin/seed-rules) instead — it runs
 * inside the Worker context where DATABASE_URL is already a Cloudflare secret.
 *
 * Run with:  pnpm --filter @bms/db seed:rules
 */

import { PrismaClient } from '@prisma/client'
import { seedRules } from '../src/seed/rules'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding transaction rules from supplier research...\n')
  const result = await seedRules(prisma)

  console.log(`Tenant: ${result.tenantName} (${result.tenantId})`)
  console.log(`Categories: ensured ${result.newCategoriesEnsured} new entries`)
  console.log(`Suppliers: upserted ${result.suppliersUpserted} records`)
  console.log(`\nRules: ${result.rulesCreated} created, ${result.rulesUpdated} updated, ${result.rulesTotal} total`)

  if (result.warnings.length > 0) {
    console.warn('\nWarnings:')
    for (const w of result.warnings) console.warn(`  ⚠ ${w}`)
  }

  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
