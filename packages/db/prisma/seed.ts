import { PrismaClient, CategoryType, UserRole } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding BMS database...')

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'kgolaentle-holdings' },
    update: {},
    create: {
      name: 'Kgolaentle Holdings',
      slug: 'kgolaentle-holdings',
    },
  })
  console.log(`Tenant: ${tenant.name}`)

  // ── Businesses ───────────────────────────────────────────────────────────────
  const businessDefs = [
    { name: 'Fastway Courier', slug: 'fastway' },
    { name: 'Opulent Beauty', slug: 'opulent-beauty' },
    { name: 'Opulent Homeware', slug: 'opulent-homeware' },
    { name: 'Kgolaentle Holdings', slug: 'kgolaentle-holdings-group' },
  ]

  for (const def of businessDefs) {
    const b = await prisma.business.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: def.slug } },
      update: {},
      create: { tenantId: tenant.id, ...def },
    })
    console.log(`  Business: ${b.name}`)
  }

  // ── Bank account ─────────────────────────────────────────────────────────────
  // id is pinned so the upsert where-clause works; BankAccount has no other unique key
  await prisma.bankAccount.upsert({
    where: { id: 'seed-stdbank-main' },
    update: {},
    create: {
      id: 'seed-stdbank-main',
      tenantId: tenant.id,
      nickname: 'Standard Bank Main',
      bankName: 'Standard Bank',
      accountType: 'Business Cheque',
      currency: 'ZAR',
    },
  })
  console.log('Bank account: Standard Bank Main')

  // ── Categories ───────────────────────────────────────────────────────────────
  const categoryDefs: Array<{
    categoryType: CategoryType
    name: string
    receiptRequired: boolean
  }> = [
    // Revenue
    { categoryType: 'REVENUE', name: 'Sales', receiptRequired: false },
    { categoryType: 'REVENUE', name: 'Courier Revenue', receiptRequired: false },
    { categoryType: 'REVENUE', name: 'Service Revenue', receiptRequired: false },
    { categoryType: 'REVENUE', name: 'Interest Received', receiptRequired: false },
    // Expense
    { categoryType: 'EXPENSE', name: 'Cost of Sales / Materials', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Fuel', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Courier Fuel', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Vehicle Maintenance', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Tolls / Parking', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Driver / Contractor Payments', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Bank Charges', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Software / Subscriptions', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Office Supplies', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Marketing', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Repairs & Maintenance', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Rent / Premises', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Utilities', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Insurance', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Professional Fees', receiptRequired: true },
    { categoryType: 'EXPENSE', name: 'Salaries / Wages', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Telephone / Data', receiptRequired: false },
    { categoryType: 'EXPENSE', name: 'Delivery / Courier', receiptRequired: false },
    // Transfer
    { categoryType: 'TRANSFER', name: 'Internal Transfer', receiptRequired: false },
    { categoryType: 'TRANSFER', name: 'Virtual Card Load', receiptRequired: false },
    { categoryType: 'TRANSFER', name: 'Savings Transfer', receiptRequired: false },
    // Owner
    { categoryType: 'OWNER', name: 'Owner Drawing', receiptRequired: false },
    { categoryType: 'OWNER', name: 'Personal Expense', receiptRequired: false },
    { categoryType: 'OWNER', name: 'Director Loan Out', receiptRequired: false },
    { categoryType: 'OWNER', name: 'Director Loan Repayment', receiptRequired: false },
    // Tax
    { categoryType: 'TAX', name: 'VAT Payment', receiptRequired: false },
    { categoryType: 'TAX', name: 'Income Tax', receiptRequired: false },
    { categoryType: 'TAX', name: 'PAYE', receiptRequired: false },
    // Unknown
    { categoryType: 'UNKNOWN', name: 'Uncategorised', receiptRequired: false },
  ]

  for (const cat of categoryDefs) {
    await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: cat.name } },
      update: {},
      create: { tenantId: tenant.id, ...cat },
    })
  }
  console.log(`Categories: ${categoryDefs.length} seeded`)

  // ── Initial admin user (dev only — bcrypt added in Plan 2) ───────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'owner@kgolaentle.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123!'
  const passwordHash = crypto.createHash('sha256').update(adminPassword).digest('hex') // replaced with bcrypt in Plan 2

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      name: 'Owner',
      role: UserRole.TENANT_OWNER,
    },
  })
  console.log(`Admin user: ${adminEmail}`)

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
