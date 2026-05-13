import {
  PrismaClient,
  CategoryType,
  UserRole,
  TransactionDirection,
  TransactionType,
  ReviewStatus,
  ReceiptMatchStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  // ── Initial admin user ───────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'owner@kgolaentle.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123!'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      name: 'Owner',
      role: UserRole.TENANT_OWNER,
    },
  })
  console.log(`Admin user: ${adminEmail}`)

  // Fetch user id for use in StatementImport
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail }, select: { id: true } })

  // ── Businesses lookup ────────────────────────────────────────────────────────
  const fastwayBiz   = await prisma.business.findFirstOrThrow({ where: { tenantId: tenant.id, slug: 'fastway' } })
  const beautyBiz    = await prisma.business.findFirstOrThrow({ where: { tenantId: tenant.id, slug: 'opulent-beauty' } })
  const homewareBiz  = await prisma.business.findFirstOrThrow({ where: { tenantId: tenant.id, slug: 'opulent-homeware' } })

  // ── Suppliers ────────────────────────────────────────────────────────────────
  const supplierDefs = [
    { name: 'Pick n Pay',         website: 'https://www.pnp.co.za',                   alias: 'PNP EASTGATE' },
    { name: 'Engen Petroleum',    website: 'https://www.engen.co.za',                  alias: 'ENGEN MIDRAND' },
    { name: 'Vodacom',            website: 'https://www.vodacom.co.za',                alias: 'VODACOM DATA' },
    { name: 'Builders Warehouse', website: 'https://www.builderswarehouse.co.za',      alias: 'BUILDERS WH SANDTON' },
    { name: 'Standard Bank',      website: 'https://www.standardbank.co.za',           alias: 'STDBNK SVC FEE' },
    { name: 'Takealot',           website: 'https://www.takealot.com',                 alias: 'TAKEALOT ONLINE' },
  ]

  const supplierMap: Record<string, string> = {} // alias → supplierId
  for (const def of supplierDefs) {
    try {
      const supplier = await prisma.supplier.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
        update: {},
        create: { tenantId: tenant.id, name: def.name, website: def.website },
      })
      try {
        await prisma.supplierAlias.upsert({
          where: { supplierId_pattern: { supplierId: supplier.id, pattern: def.alias } },
          update: {},
          create: { supplierId: supplier.id, pattern: def.alias },
        })
      } catch (e) {
        console.error(`  SupplierAlias upsert failed for ${def.alias}:`, e)
      }
      supplierMap[def.alias] = supplier.id
      console.log(`  Supplier: ${supplier.name} (alias: ${def.alias})`)
    } catch (e) {
      console.error(`  Supplier upsert failed for ${def.name}:`, e)
    }
  }

  // ── StatementImport ──────────────────────────────────────────────────────────
  let seedImport: { id: string }
  try {
    seedImport = await prisma.statementImport.upsert({
      where: { id: 'seed-import-jan24' },
      update: {},
      create: {
        id:             'seed-import-jan24',
        bankAccountId:  'seed-stdbank-main',
        importedById:   adminUser.id,
        fileName:       'stdbank_jan2024.csv',
        fileHash:       'seed-import-jan24-hash',
        rowCount:       20,
        importedCount:  20,
        status:         'COMPLETE',
      },
    })
    console.log(`StatementImport: ${seedImport.id}`)
  } catch (e) {
    console.error('StatementImport upsert failed:', e)
    // Use a fallback so the rest of the seed can continue
    seedImport = { id: 'seed-import-jan24' }
  }

  // ── Category lookup ──────────────────────────────────────────────────────────
  const catByName = async (name: string) => {
    const c = await prisma.category.findFirst({ where: { tenantId: tenant.id, name }, select: { id: true } })
    return c?.id ?? null
  }

  const catGroceries      = await catByName('Cost of Sales / Materials')
  const catFuel           = await catByName('Fuel')
  const catBankCharges    = await catByName('Bank Charges')
  const catRevenueCourier = await catByName('Courier Revenue')
  const catTelData        = await catByName('Telephone / Data')
  const catRepairs        = await catByName('Repairs & Maintenance')
  const catOfficeSupplies = await catByName('Office Supplies')
  const catSales          = await catByName('Sales')
  const catTransfer       = await catByName('Savings Transfer')
  const catOwnerDrawing   = await catByName('Owner Drawing')
  const catInterest       = await catByName('Interest Received')

  // ── Transactions ─────────────────────────────────────────────────────────────
  // balanceAfterCents starts at 5_000_000 (R50,000.00) and is adjusted per tx
  const txDefs: Array<{
    hash:         string
    date:         Date
    raw:          string
    clean:        string
    amount:       number
    direction:    TransactionDirection
    type:         TransactionType
    review:       ReviewStatus
    supplierId:   string | null
    categoryId:   string | null
    businessId:   string | null
    row:          number
  }> = [
    { hash: 'seed-tx-01', date: new Date('2024-01-03'), raw: 'PNP EASTGATE',         clean: 'Pick n Pay Eastgate',           amount:  89500, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['PNP EASTGATE']       ?? null, categoryId: catGroceries,      businessId: null },
    { hash: 'seed-tx-02', date: new Date('2024-01-05'), raw: 'ENGEN MIDRAND',         clean: 'Engen Midrand',                 amount:  74200, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['ENGEN MIDRAND']      ?? null, categoryId: catFuel,           businessId: null },
    { hash: 'seed-tx-03', date: new Date('2024-01-08'), raw: 'STDBNK SVC FEE',        clean: 'Standard Bank Service Fee',     amount:  12500, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['STDBNK SVC FEE']     ?? null, categoryId: catBankCharges,    businessId: null },
    { hash: 'seed-tx-04', date: new Date('2024-01-10'), raw: 'FASTWAY COURIER INC',   clean: 'Fastway Courier Inc',           amount: 350000, direction: 'CREDIT', type: 'REVENUE',    review: 'REVIEWED',      supplierId: null,                              categoryId: catRevenueCourier, businessId: fastwayBiz.id },
    { hash: 'seed-tx-05', date: new Date('2024-01-12'), raw: 'VODACOM DATA',           clean: 'Vodacom Data',                  amount:  49900, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['VODACOM DATA']       ?? null, categoryId: catTelData,        businessId: null },
    { hash: 'seed-tx-06', date: new Date('2024-01-15'), raw: 'BUILDERS WH SANDTON',   clean: 'Builders Warehouse Sandton',    amount: 156700, direction: 'DEBIT',  type: 'EXPENSE',    review: 'NEEDS_REVIEW',  supplierId: supplierMap['BUILDERS WH SANDTON'] ?? null, categoryId: catRepairs,        businessId: null },
    { hash: 'seed-tx-07', date: new Date('2024-01-16'), raw: 'ENGEN MIDRAND',         clean: 'Engen Midrand',                 amount:  68300, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['ENGEN MIDRAND']      ?? null, categoryId: catFuel,           businessId: null },
    { hash: 'seed-tx-08', date: new Date('2024-01-18'), raw: 'TAKEALOT ONLINE',       clean: 'Takealot Online',               amount:  34500, direction: 'DEBIT',  type: 'EXPENSE',    review: 'NEEDS_REVIEW',  supplierId: supplierMap['TAKEALOT ONLINE']    ?? null, categoryId: catOfficeSupplies, businessId: null },
    { hash: 'seed-tx-09', date: new Date('2024-01-20'), raw: 'OPULENT BEAUTY SALES',  clean: 'Opulent Beauty Sales',          amount: 185000, direction: 'CREDIT', type: 'REVENUE',    review: 'REVIEWED',      supplierId: null,                              categoryId: catSales,          businessId: beautyBiz.id },
    { hash: 'seed-tx-10', date: new Date('2024-01-22'), raw: 'PNP EASTGATE',          clean: 'Pick n Pay Eastgate',           amount:  52100, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['PNP EASTGATE']       ?? null, categoryId: catGroceries,      businessId: null },
    { hash: 'seed-tx-11', date: new Date('2024-01-23'), raw: 'TRANSFER TO SAVINGS',   clean: 'Transfer to Savings',           amount: 100000, direction: 'DEBIT',  type: 'TRANSFER',   review: 'UNCLEAR',       supplierId: null,                              categoryId: catTransfer,       businessId: null },
    { hash: 'seed-tx-12', date: new Date('2024-01-24'), raw: 'STDBNK SVC FEE',        clean: 'Standard Bank Service Fee',     amount:   8900, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['STDBNK SVC FEE']     ?? null, categoryId: catBankCharges,    businessId: null },
    { hash: 'seed-tx-13', date: new Date('2024-01-25'), raw: 'OPULENT HOMEWARE SALES',clean: 'Opulent Homeware Sales',        amount: 220000, direction: 'CREDIT', type: 'REVENUE',    review: 'REVIEWED',      supplierId: null,                              categoryId: catSales,          businessId: homewareBiz.id },
    { hash: 'seed-tx-14', date: new Date('2024-01-26'), raw: 'ENGEN MIDRAND',         clean: 'Engen Midrand',                 amount:  81400, direction: 'DEBIT',  type: 'EXPENSE',    review: 'NEEDS_REVIEW',  supplierId: supplierMap['ENGEN MIDRAND']      ?? null, categoryId: catFuel,           businessId: null },
    { hash: 'seed-tx-15', date: new Date('2024-01-28'), raw: 'BUILDERS WH SANDTON',   clean: 'Builders Warehouse Sandton',    amount:  98700, direction: 'DEBIT',  type: 'EXPENSE',    review: 'NEEDS_REVIEW',  supplierId: supplierMap['BUILDERS WH SANDTON'] ?? null, categoryId: catRepairs,        businessId: null },
    { hash: 'seed-tx-16', date: new Date('2024-01-29'), raw: 'VODACOM DATA',           clean: 'Vodacom Data',                  amount:  49900, direction: 'DEBIT',  type: 'EXPENSE',    review: 'REVIEWED',      supplierId: supplierMap['VODACOM DATA']       ?? null, categoryId: catTelData,        businessId: null },
    { hash: 'seed-tx-17', date: new Date('2024-01-30'), raw: 'FASTWAY COURIER INC',   clean: 'Fastway Courier Inc',           amount: 280000, direction: 'CREDIT', type: 'REVENUE',    review: 'REVIEWED',      supplierId: null,                              categoryId: catRevenueCourier, businessId: fastwayBiz.id },
    { hash: 'seed-tx-18', date: new Date('2024-01-30'), raw: 'TAKEALOT ONLINE',       clean: 'Takealot Online',               amount:  12300, direction: 'DEBIT',  type: 'EXPENSE',    review: 'UNCLEAR',       supplierId: supplierMap['TAKEALOT ONLINE']    ?? null, categoryId: catOfficeSupplies, businessId: null },
    { hash: 'seed-tx-19', date: new Date('2024-01-31'), raw: 'OWNER DRAWING',         clean: 'Owner Drawing',                 amount:  50000, direction: 'DEBIT',  type: 'OWNER_DRAW', review: 'REVIEWED',      supplierId: null,                              categoryId: catOwnerDrawing,   businessId: null },
    { hash: 'seed-tx-20', date: new Date('2024-01-31'), raw: 'STDBNK INTEREST',       clean: 'Standard Bank Interest',        amount:   3200, direction: 'CREDIT', type: 'REVENUE',    review: 'REVIEWED',      supplierId: null,                              categoryId: catInterest,       businessId: null },
  ].map((t, i) => ({ ...t, row: i + 1 }))

  // Compute running balance
  let balance = 5_000_000
  const txHashToId: Record<string, string> = {}

  for (const tx of txDefs) {
    if (tx.direction === 'CREDIT') {
      balance += tx.amount
    } else {
      balance -= tx.amount
    }
    const balanceAfterCents = balance
    try {
      const created = await prisma.transaction.upsert({
        where: { duplicateHash: tx.hash },
        update: {},
        create: {
          bankAccountId:     'seed-stdbank-main',
          importId:          seedImport.id,
          businessId:        tx.businessId,
          supplierId:        tx.supplierId,
          categoryId:        tx.categoryId,
          transactionDate:   tx.date,
          rawDescription:    tx.raw,
          cleanDescription:  tx.clean,
          amountCents:       tx.amount,
          balanceAfterCents,
          duplicateHash:     tx.hash,
          csvRowNumber:      tx.row,
          direction:         tx.direction,
          transactionType:   tx.type,
          reviewStatus:      tx.review,
        },
      })
      txHashToId[tx.hash] = created.id
    } catch (e) {
      console.error(`  Transaction upsert failed for ${tx.hash}:`, e)
    }
  }
  console.log(`Transactions: ${Object.keys(txHashToId).length} seeded`)

  // ── Receipts ─────────────────────────────────────────────────────────────────
  const receiptDefs: Array<{
    id:             string
    transactionHash: string | null
    phone:          string
    hintSupplier:   string
    hintAmountCents:number
    hintDate:       Date
    matchStatus:    ReceiptMatchStatus
  }> = [
    { id: 'seed-receipt-01', transactionHash: 'seed-tx-01', phone: '+27821234567', hintSupplier: 'Pick n Pay',         hintAmountCents:  89500, hintDate: new Date('2024-01-03'), matchStatus: 'MATCHED' },
    { id: 'seed-receipt-02', transactionHash: 'seed-tx-02', phone: '+27821234567', hintSupplier: 'Engen',              hintAmountCents:  74200, hintDate: new Date('2024-01-05'), matchStatus: 'MATCHED' },
    { id: 'seed-receipt-03', transactionHash: null,         phone: '+27829876543', hintSupplier: 'Builders Warehouse', hintAmountCents: 156700, hintDate: new Date('2024-01-15'), matchStatus: 'SUGGESTED' },
    { id: 'seed-receipt-04', transactionHash: null,         phone: '+27829876543', hintSupplier: 'Takealot',           hintAmountCents:  34500, hintDate: new Date('2024-01-18'), matchStatus: 'UNMATCHED' },
    { id: 'seed-receipt-05', transactionHash: null,         phone: '+27821234567', hintSupplier: 'Engen',              hintAmountCents:   9000, hintDate: new Date('2023-09-01'), matchStatus: 'STALE' },
  ]

  for (const r of receiptDefs) {
    const transactionId = r.transactionHash ? (txHashToId[r.transactionHash] ?? null) : null
    try {
      await prisma.receipt.upsert({
        where:  { id: r.id },
        update: {},
        create: {
          id:             r.id,
          transactionId,
          uploaderPhone:  r.phone,
          hintSupplier:   r.hintSupplier,
          hintAmountCents:r.hintAmountCents,
          hintDate:       r.hintDate,
          matchStatus:    r.matchStatus,
          storagePath:    `seed/receipts/${r.id}.png`,
          fileName:       `${r.id}.png`,
          fileMimeType:   'image/png',
          fileSizeBytes:  10240,
        },
      })
      console.log(`  Receipt: ${r.id} (${r.matchStatus})`)
    } catch (e) {
      console.error(`  Receipt upsert failed for ${r.id}:`, e)
    }
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
