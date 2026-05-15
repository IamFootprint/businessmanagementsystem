/**
 * Transaction rule seed data derived from bank PDF research (2026-05-15).
 *
 * This file holds the canonical rule definitions. It is consumed by:
 *   - packages/db/prisma/seed-rules.ts (CLI: pnpm --filter @bms/db seed:rules)
 *   - apps/api admin endpoint (POST /admin/seed-rules)
 *
 * Both entry points call `seedRules(prisma)` which performs idempotent upserts.
 *
 * Source research: docs/supplier-rules-research-2026-05-15.md
 */

import type { PrismaClient, CategoryType, TransactionType } from '@prisma/client'

// ─── Priority tiers ──────────────────────────────────────────────────────────
const P = {
  STAFF: 100,
  SPECIFIC_MERCHANT: 90,
  REVENUE: 85,
  FUEL_STATION: 80,
  BANK_FEE: 60,
  GENERIC: 40,
} as const

// ─── New categories needed ───────────────────────────────────────────────────
const NEW_CATEGORIES: Array<{ name: string; categoryType: CategoryType; receiptRequired: boolean }> = [
  { name: 'Vehicle Licenses', categoryType: 'EXPENSE', receiptRequired: false },
  { name: 'Compliance & Legal', categoryType: 'EXPENSE', receiptRequired: false },
]

// ─── Suppliers ────────────────────────────────────────────────────────────────
type SupplierDef = { name: string; website?: string; aliases: string[] }
const SUPPLIERS: SupplierDef[] = [
  { name: 'VHH Group',                website: 'https://fastway.co.za',         aliases: ['VHH GROUP'] },
  { name: 'Bidvest Insurance',        website: 'https://bidvestinsurance.co.za',aliases: ['BDG/BUSINS'] },
  { name: 'Global Tlayang Filling',                                              aliases: ['GLOBAL TLAYANG'] },
  { name: 'Global Boikhutso Filling',                                            aliases: ['GLOBAL BOIKHUTSO'] },
  { name: 'River Service Station',                                               aliases: ['RIVER SERVICE STATION'] },
  { name: 'Engen Mankwe',             website: 'https://engen.co.za',            aliases: ['ENGEN MANKWE'] },
  { name: 'Engen Sun City',           website: 'https://engen.co.za',            aliases: ['ENGEN SUN CITY'] },
  { name: 'Shalom Petro Wash',                                                   aliases: ['SHALOM PETRO'] },
  { name: 'Obaro Rustenburg',                                                    aliases: ['OBARO RUSTENBURG'] },
  { name: 'Die Kraal Filling',                                                   aliases: ['DIE KRAAL FILLING'] },
  { name: 'CNN Korean Parts',                                                    aliases: ['CNN KOREAN'] },
  { name: 'Glasfit',                  website: 'https://glasfit.co.za',          aliases: ['GLASFIT'] },
  { name: 'Trans-Natal Express',                                                 aliases: ['TRANS NATAL', 'TRANS-NATAL'] },
  { name: 'RTMC',                     website: 'https://rtmc.co.za',             aliases: ['RTMC '] },
  { name: 'CIPC',                     website: 'https://cipc.co.za',             aliases: ['CIPC'] },
  { name: 'Department of Labour',                                                aliases: ['DEPT OF LABOUR'] },
  { name: 'Vox Telecom',              website: 'https://voxtelecom.co.za',       aliases: ['VOX TELECOMMS'] },
  { name: 'Telkom Mobile',            website: 'https://telkom.co.za',           aliases: ['TELKOM MOBILE'] },
  { name: 'GoDaddy',                  website: 'https://godaddy.com',            aliases: ['GODADDY'] },
  { name: 'Wix.com',                  website: 'https://wix.com',                aliases: ['WIX.COM'] },
  { name: 'Meta (Facebook Ads)',      website: 'https://facebook.com',           aliases: ['FACEBK'] },
  { name: 'Jetline',                  website: 'https://jetline.co.za',          aliases: ['JETLINE'] },
  { name: 'J Govender (Opulent Rent)',                                           aliases: ['J GOVENDER'] },
]

// ─── Rules ────────────────────────────────────────────────────────────────────
type RuleDef = {
  name: string
  descriptionPattern: string
  category?: string
  supplier?: string
  business?: string
  transactionType: TransactionType
  isPersonal?: boolean
  receiptRequired?: boolean
  trustedAutoReview: boolean
  priority: number
}

const RULES: RuleDef[] = [
  // ─── REVENUE ──────────────────────────────────────────────────────────────
  { name: 'VHH Group / Fastway franchise income (EFT)', descriptionPattern: 'VHH GROUP',
    category: 'Courier Revenue', supplier: 'VHH Group', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.REVENUE },
  { name: 'VHH Group via Netcash', descriptionPattern: 'NETCASH071VHH',
    category: 'Courier Revenue', supplier: 'VHH Group', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.REVENUE },
  { name: 'CF Weekly Payments (Fastway)', descriptionPattern: 'CF WEEKLY PAYME',
    category: 'Courier Revenue', supplier: 'VHH Group', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.REVENUE },
  { name: 'EFTPOS card settlement (Credit Card)', descriptionPattern: 'CR EFTPOS 2KC',
    category: 'Courier Revenue', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.REVENUE },
  { name: 'EFTPOS card settlement (Debit Card)', descriptionPattern: 'DR EFTPOS 2KC',
    category: 'Courier Revenue', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.REVENUE },

  // ─── BANK CHARGES ──────────────────────────────────────────────────────────
  { name: 'Bank fee: Overdraft Interest', descriptionPattern: 'OVERDRAFT INTEREST',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Monthly Management', descriptionPattern: 'MONTHLY MANAGEMENT FEE',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Immediate Payment', descriptionPattern: 'FEE IMMEDIATE PAYMENT',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Electronic Account Payment', descriptionPattern: 'FEE-ELECTRONIC ACCOUNT PAYMENT',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Overdraft Service', descriptionPattern: 'OVERDRAFT SERVICE FEE',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Cheque Card Purchase', descriptionPattern: 'FEE-CHEQ CARD PURCHASE',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Debit Card Purchase', descriptionPattern: 'DEBIT CARD PURCHASE FEE',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Unused Facility', descriptionPattern: 'FEE: UNUSED FACILITY',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Prepaid Mobile Purchase', descriptionPattern: 'FEE: PREPAID MOBILE PURCHASE',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: PayShap', descriptionPattern: 'FEE: PAYSHAP',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: International Transaction', descriptionPattern: '#INTERNATIONAL4278193343490900',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: MyUpdates for Business', descriptionPattern: 'MYUPDATES FOR BUSINESS',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: UCount Membership', descriptionPattern: 'UCOUNT',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Debit Order', descriptionPattern: 'FEE - DEBIT ORDER',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Payment Confirm Email', descriptionPattern: 'FEE: PAYMENT CONFIRM',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },
  { name: 'Bank fee: Annual Review', descriptionPattern: 'FEE: ANNUAL REVIEW',
    category: 'Bank Charges', supplier: 'Standard Bank', transactionType: 'BANK_CHARGE', trustedAutoReview: true, priority: P.BANK_FEE },

  // ─── INSURANCE ─────────────────────────────────────────────────────────────
  { name: 'Bidvest Insurance — Vehicle Premium', descriptionPattern: 'BDG/BUSINS819045252',
    category: 'Insurance', supplier: 'Bidvest Insurance',
    transactionType: 'EXPENSE', receiptRequired: false, trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── FUEL ──────────────────────────────────────────────────────────────────
  { name: 'Fuel: Global Tlayang', descriptionPattern: 'GLOBAL TLAYANG',
    category: 'Courier Fuel', supplier: 'Global Tlayang Filling',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Global Boikhutso', descriptionPattern: 'GLOBAL BOIKHUTSO',
    category: 'Courier Fuel', supplier: 'Global Boikhutso Filling',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: River Service Station', descriptionPattern: 'RIVER SERVICE STATION',
    category: 'Courier Fuel', supplier: 'River Service Station',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Engen Mankwe', descriptionPattern: 'ENGEN MANKWE',
    category: 'Courier Fuel', supplier: 'Engen Mankwe',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Engen Sun City', descriptionPattern: 'ENGEN SUN CITY',
    category: 'Courier Fuel', supplier: 'Engen Sun City',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Shalom Petro Wash', descriptionPattern: 'SHALOM PETRO',
    category: 'Courier Fuel', supplier: 'Shalom Petro Wash',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Obaro Rustenburg', descriptionPattern: 'OBARO RUSTENBURG',
    category: 'Courier Fuel', supplier: 'Obaro Rustenburg',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Die Kraal Filling', descriptionPattern: 'DIE KRAAL FILLING',
    category: 'Courier Fuel', supplier: 'Die Kraal Filling',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },

  // ─── VEHICLE MAINTENANCE ───────────────────────────────────────────────────
  { name: 'Vehicle: CNN Korean Parts', descriptionPattern: 'CNN KOREAN',
    category: 'Vehicle Maintenance', supplier: 'CNN Korean Parts',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Vehicle: Glasfit (Windscreen)', descriptionPattern: 'GLASFIT',
    category: 'Vehicle Maintenance', supplier: 'Glasfit',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── COURIER SUBCONTRACTOR ─────────────────────────────────────────────────
  { name: 'Trans-Natal Express (sub-contracted courier)', descriptionPattern: 'TRANS-NATAL',
    category: 'Delivery / Courier', supplier: 'Trans-Natal Express',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Trans Natal (no-dash variant)', descriptionPattern: 'TRANS NATAL',
    category: 'Delivery / Courier', supplier: 'Trans-Natal Express',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── COMPLIANCE & LEGAL ────────────────────────────────────────────────────
  { name: 'RTMC — Vehicle Licence', descriptionPattern: 'RTMC ',
    category: 'Vehicle Licenses', supplier: 'RTMC',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'CIPC — Companies Commission', descriptionPattern: 'CIPC',
    category: 'Compliance & Legal', supplier: 'CIPC',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Dept of Labour — UIF', descriptionPattern: 'DEPT OF LABOUR',
    category: 'Compliance & Legal', supplier: 'Department of Labour',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── TELECOMS ──────────────────────────────────────────────────────────────
  { name: 'Vox Telecom — VoIP', descriptionPattern: 'VOX TELECOMMS',
    category: 'Telephone / Data', supplier: 'Vox Telecom',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Telkom Mobile — Prepaid', descriptionPattern: 'TELKOM MOBILE',
    category: 'Telephone / Data', supplier: 'Telkom Mobile',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Prepaid Mobile (generic VAS)', descriptionPattern: 'VAS00',
    category: 'Telephone / Data',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.GENERIC },
  { name: 'Prepaid Mobile Purchase (generic)', descriptionPattern: 'PREPAID MOBILE PURCHASE',
    category: 'Telephone / Data',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.GENERIC },

  // ─── SOFTWARE / SUBSCRIPTIONS ──────────────────────────────────────────────
  { name: 'GoDaddy — Domain Registration', descriptionPattern: 'GODADDY',
    category: 'Software / Subscriptions', supplier: 'GoDaddy',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Wix.com — Website Builder', descriptionPattern: 'WIX.COM',
    category: 'Software / Subscriptions', supplier: 'Wix.com',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── MARKETING ─────────────────────────────────────────────────────────────
  { name: 'Facebook / Meta Ads', descriptionPattern: 'FACEBK',
    category: 'Marketing', supplier: 'Meta (Facebook Ads)',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Jetline — Printing/Signage', descriptionPattern: 'JETLINE',
    category: 'Marketing', supplier: 'Jetline',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── RENT ──────────────────────────────────────────────────────────────────
  { name: 'J Govender — Opulent Rent', descriptionPattern: 'J GOVENDER',
    category: 'Rent / Premises', supplier: 'J Govender (Opulent Rent)',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── SALARIES ──────────────────────────────────────────────────────────────
  { name: 'Salary: Thabang John Moreo', descriptionPattern: 'THABANG JOHN MORE',
    category: 'Salaries / Wages',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Tunnel Mangozvana', descriptionPattern: 'TUNNEL MANGOZVAN',
    category: 'Salaries / Wages',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Irene Sarifo', descriptionPattern: 'IRENE SARIFO',
    category: 'Salaries / Wages',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: C Nyoni Charlotte', descriptionPattern: 'C NYONI',
    category: 'Salaries / Wages',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Tryness Tembo', descriptionPattern: 'TRYNESS TEMBO',
    category: 'Salaries / Wages',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },

  // ─── PERSONAL EXPENSES ─────────────────────────────────────────────────────
  { name: 'Personal: Planet Nails', descriptionPattern: 'PLANET NAILS',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Crazy Plastic', descriptionPattern: 'CRAZY PLASTIC',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Bling Girl', descriptionPattern: 'BLING GIRL',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Bestco Lifestyle', descriptionPattern: 'BESTCO LIFEST',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Netflix', descriptionPattern: 'NETFLIX',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Showmax', descriptionPattern: 'SHOWMAX',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Dischem', descriptionPattern: 'DISCHEM',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Clicks', descriptionPattern: 'CLICKS',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
]

export type SeedRulesResult = {
  tenantId: string
  tenantName: string
  newCategoriesEnsured: number
  suppliersUpserted: number
  rulesCreated: number
  rulesUpdated: number
  rulesTotal: number
  warnings: string[]
}

const TENANT_SLUG = 'kgolaentle-holdings'

/**
 * Idempotently seed transaction rules + supporting suppliers and categories
 * into the database. Safe to re-run; existing rules are updated by [tenantId, name].
 */
export async function seedRules(prisma: PrismaClient): Promise<SeedRulesResult> {
  const warnings: string[] = []

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } })

  // Ensure new categories exist
  for (const cat of NEW_CATEGORIES) {
    await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: cat.name } },
      update: { categoryType: cat.categoryType, receiptRequired: cat.receiptRequired },
      create: { tenantId: tenant.id, ...cat },
    })
  }

  // Upsert suppliers with aliases
  const supplierIdByName: Record<string, string> = {}
  for (const def of SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
      update: { website: def.website },
      create: { tenantId: tenant.id, name: def.name, website: def.website },
    })
    supplierIdByName[def.name] = supplier.id
    for (const alias of def.aliases) {
      await prisma.supplierAlias.upsert({
        where: { supplierId_pattern: { supplierId: supplier.id, pattern: alias } },
        update: {},
        create: { supplierId: supplier.id, pattern: alias },
      })
    }
  }

  // Look up Standard Bank from existing base seed
  const stdBank = await prisma.supplier.findFirst({ where: { tenantId: tenant.id, name: 'Standard Bank' } })
  if (stdBank) supplierIdByName['Standard Bank'] = stdBank.id

  // Build category and business lookups
  const categories = await prisma.category.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true } })
  const categoryIdByName: Record<string, string> = Object.fromEntries(categories.map(c => [c.name, c.id]))

  const businesses = await prisma.business.findMany({ where: { tenantId: tenant.id }, select: { id: true, slug: true } })
  const businessIdBySlug: Record<string, string> = Object.fromEntries(businesses.map(b => [b.slug, b.id]))

  // Upsert rules
  let created = 0, updated = 0
  for (const def of RULES) {
    const categoryId = def.category ? categoryIdByName[def.category] ?? null : null
    const supplierId = def.supplier ? supplierIdByName[def.supplier] ?? null : null
    const businessId = def.business ? businessIdBySlug[def.business] ?? null : null

    if (def.category && !categoryId) warnings.push(`Category not found for rule "${def.name}": ${def.category}`)
    if (def.supplier && !supplierId) warnings.push(`Supplier not found for rule "${def.name}": ${def.supplier}`)

    const existing = await prisma.transactionRule.findFirst({
      where: { tenantId: tenant.id, name: def.name },
      select: { id: true },
    })

    const data = {
      descriptionPattern: def.descriptionPattern,
      categoryId, supplierId, businessId,
      transactionType: def.transactionType,
      isPersonal: def.isPersonal ?? null,
      receiptRequired: def.receiptRequired ?? null,
      trustedAutoReview: def.trustedAutoReview,
      priority: def.priority,
      active: true,
    }

    if (existing) {
      await prisma.transactionRule.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.transactionRule.create({
        data: { tenantId: tenant.id, name: def.name, ...data },
      })
      created++
    }
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    newCategoriesEnsured: NEW_CATEGORIES.length,
    suppliersUpserted: SUPPLIERS.length,
    rulesCreated: created,
    rulesUpdated: updated,
    rulesTotal: RULES.length,
    warnings,
  }
}
