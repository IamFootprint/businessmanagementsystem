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
type SupplierDef = { name: string; website?: string; aliases: string[]; notes?: string }
const SUPPLIERS: SupplierDef[] = [
  // ── Logistics / Courier ─────────────────────────────────────────────────────
  { name: 'VHH Group',
    website: 'https://www.fastway.co.za',
    aliases: ['VHH GROUP', 'NETCASH071VHH', 'CF WEEKLY PAYME'],
    notes: 'VHH Group — Fastway Rustenburg Regional Franchisor. Kgolaentle Holdings operates "Fastway Sun City" as a sub-franchise under VHH Group. All revenue from VHH Group is the Fastway Sun City franchise income (weekly payouts via EFT and Netcash). Fastway national network is owned by City Logistics + Clearwater Capital since Aug 2022; VHH is the regional franchisor layer.' },
  { name: 'Transnatal Glass Factory',
    website: 'https://transnatal.co.za',
    aliases: ['TRANS NATAL', 'TRANS-NATAL', 'C*TRANS NATAL', 'C*TRANS-NATAL'],
    notes: 'Glassware / homeware wholesaler — supplier for the Opulent Homeware business wing (now wound down). 185 Voortrekker Road, Factoria, Krugersdorp 1739. Stocks glassware, tableware, vases, candle holders, decorative homewares (Duralex, RCR, Bohemia, Lav). Historical purchases — Opulent Homeware sold via Shopify + Takealot from 2023 through ~mid-2025. Mark as legacy/inactive once final invoices are settled.' },
  { name: 'Seeff JHB North West',
    website: 'https://www.seeff.com',
    aliases: ['SEEFF JHB', 'SEEFF JHB NORTH WEST'],
    notes: 'Seeff Properties (JHB North West branch) — CURRENT landlord/managing agent for the Opulent Beauty salon premises. First payment Jan 2026 (replaced J Govender after salon relocation). Larger January payments include deposit + first-month rent; ongoing monthly variable. Seeff Property Group founded 1964; ~220 branches; exclusive SA associate of Hamptons International (UK). Branch covers Rustenburg / NW area.' },

  // ── Insurance ───────────────────────────────────────────────────────────────
  { name: 'Bidvest Insurance',
    website: 'https://bidvestinsurance.co.za',
    aliases: ['BDG/BUSINS', 'BDG/BUSINS819045252'],
    notes: 'Bidvest Insurance Limited (subsidiary of The Bidvest Group Ltd) — authorised FSP for short-term insurance. Reference 819045252 is the policy number. Premium R2,989/month debit order on last day of month. Vehicle/fleet insurance product. HQ in Umhlanga Rocks, KwaZulu-Natal.' },

  // ── Fuel stations ───────────────────────────────────────────────────────────
  { name: 'Global Tlayang Filling',
    website: 'https://www.globaloil.co.za',
    aliases: ['GLOBAL TLAYANG'],
    notes: 'Independent filling station under the Global Oil brand (100% black-owned SA fuel retail). Located in the Rustenburg/Mogwase area, services platinum-belt traffic. Minimal web presence (Hellopeter listing only). Primary fuel supplier — used weekly.' },
  { name: 'Global Boikhutso Filling',
    website: 'https://www.globaloil.co.za',
    aliases: ['GLOBAL BOIKHUTSO'],
    notes: 'Global Oil-branded filling station in Mogwase (Boikhutso is the Mogwase township, North West — not Hammanskraal). Possibly the same site as "Exel Boikhutso" at 1401 Tlhantlhagane St, Mogwase 0314. Independent dealer.' },
  { name: 'River Service Station',
    aliases: ['RIVER SERVICE STATION'],
    notes: 'Filling station — "MOGWA" suffix on some statement entries suggests Mogwase/Pilanesberg area (the "JHB" prefix may be the merchant settlement city, not the physical address). No dedicated web presence. Used monthly.' },
  { name: 'Engen Mankwe',
    website: 'https://www.engen.co.za',
    aliases: ['ENGEN MANKWE'],
    notes: 'Engen Mankwe Convenience Centre — 24-hour Engen forecourt with shop, bakery, Debonairs and Steers QSR. Cnr President Avenue & R510, Mogwase, North West. Phone +27 13 751 2620. Sits on the R510 between Rustenburg and Thabazimbi.' },
  { name: 'Engen Sun City',
    website: 'https://www.engen.co.za',
    aliases: ['ENGEN SUN CITY'],
    notes: 'Engen-branded 24-hour forecourt servicing the Sun City resort area; possibly also Engen Sun Village in the adjacent shopping complex. R556, Sun City / Pilanesberg, North West, 0316. Phone +27 14 552 1295.' },
  { name: 'Shalom Petro Wash',
    aliases: ['SHALOM PETRO'],
    notes: 'TotalEnergies-branded filling station (trading as "Total Shalom Petro Wash") with car wash, Buzzcafe convenience store and Shalom MBT bay (tyres/batteries/exhausts). 54 Bosch Street (cnr Bosch & Zendeling), Rustenburg 0299. Phone +27 14 597 0913.' },
  { name: 'Obaro Rustenburg',
    website: 'https://obaro.co.za/archives/obaro_branch/obaro-rustenburg',
    aliases: ['OBARO RUSTENBURG'],
    notes: 'Obaro (Pty) Ltd — Rustenburg branch. Agricultural co-op / retail chain with 24-hour fuel forecourt on-site. Sells irrigation, hardware, animal feed, seed, fertiliser, pet products, farm spares. 47 Lucas Street, Rustenburg. Phone +27 14 592 2328. One of 27 Obaro branches across northern SA.' },
  { name: 'Die Kraal Filling',
    aliases: ['DIE KRAAL FILLING'],
    notes: 'Small independent filling station in the Beestekraal area (north of Brits, on the road/rail corridor to Thabazimbi). No verifiable online listing. Used occasionally for long-haul fills.' },
  { name: 'Pilanesberg Motors (Total)',
    aliases: ['PILANESBURG MOTORS', 'PILANESBERG MOTORS'],
    notes: 'TotalEnergies-branded filling station — NOT a motor dealership despite the name. Rustenburg/Pilanesberg area. Often misspelled as "Pilanesburg" on bank statements. Reclassify any past Vehicle Maintenance categorisations to Fuel & Oil.' },

  // ── Vehicle parts / services ────────────────────────────────────────────────
  { name: 'CNN Korean Parts',
    aliases: ['CNN KOREAN'],
    notes: 'Korean auto parts retailer specialising in Kia and Hyundai (new + second-hand original / quality-generic). 57 Molen Street, Rustenburg 0300. Hours Mon-Fri 07:30-17:30, Sat 08:00-13:00. Facebook only (no website): https://www.facebook.com/CnnKoreanParts/' },
  { name: 'Glasfit',
    website: 'https://www.glasfit.com',
    aliases: ['GLASFIT'],
    notes: 'Glasfit (Pty) Ltd — national windscreen specialists (115+ fitment centres). Chip repair, full replacement, side/rear windows, smash-and-grab film, tinting, vehicle inspections. Founded 1989. Arrive Alive road-safety partner.' },

  // ── Government / Compliance ─────────────────────────────────────────────────
  { name: 'RTMC',
    website: 'https://www.rtmc.co.za',
    aliases: ['RTMC '],
    notes: 'Road Traffic Management Corporation — government agency under the Department of Transport. Runs the eNaTIS online platform for vehicle licence/registration. Eco Origin Office Park, Block F, 349 Witch-Hazel Street, Highveld Ext 79, Centurion. Operational since April 2005.' },
  { name: 'CIPC',
    website: 'https://www.cipc.co.za',
    aliases: ['CIPC'],
    notes: 'Companies and Intellectual Property Commission (Department of Trade, Industry and Competition). Handles company/CC/co-op registration, trademarks, patents, designs, copyrights, and annual returns. BizPortal is the digital services entry point. the dtic Campus, Block F, 77 Meintjies Street, Sunnyside, Pretoria. Formed 1 May 2011.' },
  { name: 'Department of Labour',
    website: 'https://www.labour.gov.za',
    aliases: ['DEPT OF LABOUR'],
    notes: 'Department of Employment and Labour — administers the UIF (Unemployment Insurance Fund). UIF funded by 1% employee + 1% employer contributions, submitted monthly via uFiling (https://ufiling.labour.gov.za/uif/) or SARS EMP201.' },

  // ── Telecoms ────────────────────────────────────────────────────────────────
  { name: 'Vox Telecom',
    website: 'https://www.vox.co.za',
    aliases: ['VOX TELECOMMS'],
    notes: 'Vox Telecommunications (Pty) Ltd — one of SA\'s largest telcos. Fibre (home + business), VoIP, cloud PBX, cloud hosting, managed IT across 7 FNO networks. Owns Frogfoot Networks. HQ Johannesburg. Founded 1998, ~1,500 employees. Recurring R500-600/month for VoIP line.' },
  { name: 'Telkom Mobile',
    website: 'https://www.telkom.co.za',
    aliases: ['TELKOM MOBILE'],
    notes: 'Telkom SA SOC Ltd (Mobile division) — 3rd-largest MNO in SA behind Vodacom and MTN (~24m subscribers). Mobile, fixed-line, fibre, ADSL, 5G FWA. HQ Centurion. Mobile launched 2010 as 8ta, rebranded to Telkom Mobile. Partially state-owned.' },
  { name: 'MTN',
    website: 'https://www.mtn.co.za',
    aliases: ['MTN '],
    notes: 'MTN Group Limited — second-largest mobile network operator in SA (behind Vodacom). Prepaid airtime/data for staff phones used in Fastway courier operations. HQ Johannesburg.' },

  // ── Software / Subscriptions ────────────────────────────────────────────────
  { name: 'GoDaddy',
    website: 'https://www.godaddy.com',
    aliases: ['GODADDY', 'DNH*GODADDY'],
    notes: 'GoDaddy Inc. (NYSE: GDDY) — world\'s largest domain registrar (~62m domains, 20m+ customers). Domain registration, hosting, website builder, email, SSL, SMB SaaS. HQ Tempe, Arizona, USA. Founded 1997 by Bob Parsons. Multiple monthly charges suggest multiple domains under management.' },
  { name: 'Wix.com',
    website: 'https://www.wix.com',
    aliases: ['WIX.COM'],
    notes: 'Wix.com Ltd (NASDAQ: WIX) — cloud drag-and-drop website builder with hosting, eCommerce, marketing, and AI site-generation. HQ 40 Namal Tel Aviv Street, Tel Aviv-Yafo, Israel. Monthly R198-203 subscription.' },
  { name: 'Meta (Facebook Ads)',
    website: 'https://business.meta.com',
    aliases: ['FACEBK'],
    notes: 'Meta Platforms, Inc. — operator of Facebook, Instagram, WhatsApp, Messenger, Threads. Ad spend billed via Meta Ads Manager (Meta Platforms Ireland Ltd for SA advertisers). HQ Menlo Park, California. Campaign codes vary per ad (FACEBK *ZJ5LG etc.).' },
  { name: 'MyAppointment SA',
    website: 'https://www.myappointment.co.za',
    aliases: ['MYAPPTMENTMY', 'MYAPPOINTMENT'],
    notes: 'Cloud-based appointment scheduling SaaS for health / beauty / wellness — appointments, invoicing, loyalty, client DB, stock. iOS + Android apps. R560/month subscription. Note: "OpulenMD" reference on some entries has no separate web presence — likely a white-label or internal product code for the same platform. Confirm with supplier.' },

  // ── Marketing / Printing ────────────────────────────────────────────────────
  { name: 'Jetline',
    website: 'https://www.jetline.co.za',
    aliases: ['JETLINE'],
    notes: 'Jetline Print (Pty) Ltd — nationwide print-and-branding franchise. Graphic design, full-colour / B&W print, corporate stationery, banners, signage (Perspex, Correx, PVC, ABS, Foam Board), vehicle branding, websites. R244 per order observed.' },

  // ── Property ────────────────────────────────────────────────────────────────
  { name: 'J Govender (Opulent Rent)',
    aliases: ['J GOVENDER'],
    notes: 'Private landlord — PREVIOUS Opulent Beauty salon premises (vacated ~Jan 2026). Fixed R8,800/month direct EFT. Last payment recorded 30 Dec 2025. Replaced by Seeff JHB North West when the salon relocated. Rule kept active for back-fill of historical 2025 imports.' },

  // ── Office equipment ────────────────────────────────────────────────────────
  { name: 'TB Machines',
    website: 'https://tbmachines.co.za',
    aliases: ['TB MACHINES'],
    notes: 'Office machine sales/service + stationery. Copiers, printers, fax, shredders, scales, cash registers, calculators. Stocks toner/cartridges (HP, Canon, Epson, Samsung, Lexmark, Ricoh). Also offers printing, copying, laminating, binding. Likely used for till rolls / printer consumables for the courier admin.' },

  // ── Furniture & Décor (Opulent Homeware suppliers) ──────────────────────────
  { name: 'Gaoya Furniture',
    aliases: ['GAOYA FURNITU', 'QS TRADING GAOYA'],
    notes: 'Chinese-import furniture supplier (Chaneng area). Sold patio couches, decorative furniture and homeware. Inventory supplier for the Opulent Homeware wing (now wound down). Some payments routed via QS Trading as middleman.' },
  { name: 'Curtain Studio',
    aliases: ['CURTAIN STUDI'],
    notes: 'Curtains and soft-furnishings retailer. Inventory supplier for the Opulent Homeware wing.' },
  { name: 'Jozi Curtains',
    aliases: ['JOZI CURTAINS'],
    notes: 'Johannesburg-based curtains supplier. Legacy 2023 inventory source for the Opulent Homeware Shopify/Takealot store.' },
  { name: 'Z & I Curtains',
    aliases: ['HPY*Z & I CUR', 'Z & I CUR'],
    notes: 'Curtains supplier (HPY* prefix indicates payment via Happy Pay or similar processor). Inventory supplier for Opulent Homeware.' },
  { name: 'Mayos Coffee Table',
    aliases: ['MAYOS COFFEE TABLE'],
    notes: 'Coffee table / furniture wholesaler. Legacy 2023 inventory supplier for Opulent Homeware.' },
  { name: 'AM Arman Rugs',
    aliases: ['AM ARMAN RUGS'],
    notes: 'Rug wholesaler. Legacy 2023 inventory supplier for Opulent Homeware (~R7,000 single purchase observed).' },
  { name: 'Narsar Trading',
    aliases: ['NARSAR TRADIN'],
    notes: 'Johannesburg wholesale supplier. Legacy 2023 inventory source for Opulent Homeware (mixed decor and household goods).' },
  { name: 'China Square',
    aliases: ['CHINA SQUARE'],
    notes: 'China Square — Johannesburg Chinese wholesale market, source of low-cost homeware, decor and giftware. Legacy 2023 inventory supplier for Opulent Homeware.' },
  { name: 'Fantasy Cash & Carry',
    aliases: ['FANTASY CASH'],
    notes: 'Cash & Carry wholesaler. Legacy 2023 inventory supplier for Opulent Homeware (mixed decor, household, plastic goods).' },
  { name: 'Hyperland',
    aliases: ['HYPERLAND HIL'],
    notes: 'Hyperland Hillcrest — hypermarket / decor + homeware retailer. Inventory source for Opulent Homeware.' },
  { name: 'Shop 26C',
    aliases: ['SHOP 26C CHIN'],
    notes: 'Chinese homeware retail shop. Décor and giftware purchases for Opulent Homeware.' },
  { name: 'Valueco',
    aliases: ['VALUECO CLEAR'],
    notes: 'Valueco Clearwater — discount homeware + decor retailer. Inventory source for Opulent Homeware.' },
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
  // Legacy 2023 Fastway revenue — before VHH Group rebrand
  { name: 'Fastway RBG (legacy 2023 franchise income)', descriptionPattern: 'FASTWAY RBG',
    category: 'Courier Revenue', supplier: 'VHH Group', business: 'fastway',
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
    category: 'Insurance', supplier: 'Bidvest Insurance', business: 'fastway',
    transactionType: 'EXPENSE', receiptRequired: false, trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── FUEL ──────────────────────────────────────────────────────────────────
  { name: 'Fuel: Global Tlayang', descriptionPattern: 'GLOBAL TLAYANG',
    category: 'Courier Fuel', supplier: 'Global Tlayang Filling', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Global Boikhutso', descriptionPattern: 'GLOBAL BOIKHUTSO',
    category: 'Courier Fuel', supplier: 'Global Boikhutso Filling', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: River Service Station', descriptionPattern: 'RIVER SERVICE STATION',
    category: 'Courier Fuel', supplier: 'River Service Station', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Engen Mankwe', descriptionPattern: 'ENGEN MANKWE',
    category: 'Courier Fuel', supplier: 'Engen Mankwe', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Engen Sun City', descriptionPattern: 'ENGEN SUN CITY',
    category: 'Courier Fuel', supplier: 'Engen Sun City', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Shalom Petro Wash', descriptionPattern: 'SHALOM PETRO',
    category: 'Courier Fuel', supplier: 'Shalom Petro Wash', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Obaro Rustenburg', descriptionPattern: 'OBARO RUSTENBURG',
    category: 'Courier Fuel', supplier: 'Obaro Rustenburg', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Die Kraal Filling', descriptionPattern: 'DIE KRAAL FILLING',
    category: 'Courier Fuel', supplier: 'Die Kraal Filling', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },
  { name: 'Fuel: Pilanesberg Motors (Total forecourt)', descriptionPattern: 'PILANESBURG MOTORS',
    category: 'Courier Fuel', supplier: 'Pilanesberg Motors (Total)', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.FUEL_STATION },

  // ─── VEHICLE MAINTENANCE ───────────────────────────────────────────────────
  { name: 'Vehicle: CNN Korean Parts', descriptionPattern: 'CNN KOREAN',
    category: 'Vehicle Maintenance', supplier: 'CNN Korean Parts', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Vehicle: Glasfit (Windscreen)', descriptionPattern: 'GLASFIT',
    category: 'Vehicle Maintenance', supplier: 'Glasfit', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── OPULENT HOMEWARE — Furniture / Décor / Inventory ──────────────────────
  // All furniture and décor suppliers attributed to opulent-homeware so the
  // historical e-commerce wing's P&L reflects its true cost of sales.
  // Some of these are legacy 2023 inventory; some are still occasional purchases.
  { name: 'Transnatal Glass Factory (Opulent Homeware inventory)', descriptionPattern: 'TRANS-NATAL',
    category: 'Cost of Sales / Materials', supplier: 'Transnatal Glass Factory', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Trans Natal — no-dash variant (Opulent Homeware)', descriptionPattern: 'C*TRANS NATAL',
    category: 'Cost of Sales / Materials', supplier: 'Transnatal Glass Factory', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Gaoya Furniture (patio + decor)', descriptionPattern: 'GAOYA FURNITU',
    category: 'Cost of Sales / Materials', supplier: 'Gaoya Furniture', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'QS Trading (Gaoya routing)', descriptionPattern: 'QS TRADING',
    category: 'Cost of Sales / Materials', supplier: 'Gaoya Furniture', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Curtain Studio', descriptionPattern: 'CURTAIN STUDI',
    category: 'Cost of Sales / Materials', supplier: 'Curtain Studio', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Jozi Curtains', descriptionPattern: 'JOZI CURTAINS',
    category: 'Cost of Sales / Materials', supplier: 'Jozi Curtains', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Z & I Curtains', descriptionPattern: 'Z & I CUR',
    category: 'Cost of Sales / Materials', supplier: 'Z & I Curtains', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Mayos Coffee Table', descriptionPattern: 'MAYOS COFFEE TABLE',
    category: 'Cost of Sales / Materials', supplier: 'Mayos Coffee Table', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'AM Arman Rugs', descriptionPattern: 'AM ARMAN RUGS',
    category: 'Cost of Sales / Materials', supplier: 'AM Arman Rugs', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Narsar Trading', descriptionPattern: 'NARSAR TRADIN',
    category: 'Cost of Sales / Materials', supplier: 'Narsar Trading', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'China Square', descriptionPattern: 'CHINA SQUARE',
    category: 'Cost of Sales / Materials', supplier: 'China Square', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Fantasy Cash & Carry', descriptionPattern: 'FANTASY CASH',
    category: 'Cost of Sales / Materials', supplier: 'Fantasy Cash & Carry', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Hyperland Homeware', descriptionPattern: 'HYPERLAND',
    category: 'Cost of Sales / Materials', supplier: 'Hyperland', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Shop 26C (Chinese decor)', descriptionPattern: 'SHOP 26C',
    category: 'Cost of Sales / Materials', supplier: 'Shop 26C', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Valueco (decor)', descriptionPattern: 'VALUECO CLEAR',
    category: 'Cost of Sales / Materials', supplier: 'Valueco', business: 'opulent-homeware',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── COMPLIANCE & LEGAL ────────────────────────────────────────────────────
  { name: 'RTMC — Vehicle Licence', descriptionPattern: 'RTMC ',
    category: 'Vehicle Licenses', supplier: 'RTMC', business: 'fastway',
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
    category: 'Telephone / Data', supplier: 'Telkom Mobile', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Vodacom — Prepaid', descriptionPattern: 'VODACOM',
    category: 'Telephone / Data', supplier: 'Vodacom', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Vodacom prepaid (VOD PREPAID)', descriptionPattern: 'VOD PREPAID',
    category: 'Telephone / Data', supplier: 'Vodacom', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'MTN — Prepaid', descriptionPattern: 'MTN ',
    category: 'Telephone / Data', supplier: 'MTN', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Prepaid Mobile (generic VAS)', descriptionPattern: 'VAS00',
    category: 'Telephone / Data', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.GENERIC },
  { name: 'Prepaid Mobile Purchase (generic)', descriptionPattern: 'PREPAID MOBILE PURCHASE',
    category: 'Telephone / Data', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.GENERIC },

  // ─── SOFTWARE / SUBSCRIPTIONS ──────────────────────────────────────────────
  { name: 'GoDaddy — Domain Registration', descriptionPattern: 'GODADDY',
    category: 'Software / Subscriptions', supplier: 'GoDaddy',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Wix.com — Website Builder', descriptionPattern: 'WIX.COM',
    category: 'Software / Subscriptions', supplier: 'Wix.com',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── REVENUE — incoming customer payments ─────────────────────────────────
  { name: 'Capitec — customer EFT (Fastway)', descriptionPattern: 'CAPITEC',
    category: 'Courier Revenue', business: 'fastway',
    transactionType: 'REVENUE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── MARKETING ─────────────────────────────────────────────────────────────
  { name: 'Facebook / Meta Ads', descriptionPattern: 'FACEBK',
    category: 'Marketing', supplier: 'Meta (Facebook Ads)', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Jetline — Printing/Signage', descriptionPattern: 'JETLINE',
    category: 'Marketing', supplier: 'Jetline',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'TB Machines — Office Equipment/Supplies', descriptionPattern: 'TB MACHINES',
    category: 'Office Supplies', supplier: 'TB Machines',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'MyAppointment SA — Booking subscription', descriptionPattern: 'MYAPPTMENTMY',
    category: 'Software / Subscriptions', supplier: 'MyAppointment SA',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── RENT (Opulent Beauty premises) ────────────────────────────────────────
  { name: 'J Govender — Opulent Beauty Rent', descriptionPattern: 'J GOVENDER',
    category: 'Rent / Premises', supplier: 'J Govender (Opulent Rent)', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Seeff — Opulent Beauty Rental', descriptionPattern: 'SEEFF JHB',
    category: 'Rent / Premises', supplier: 'Seeff JHB North West', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },

  // ─── SALARIES ──────────────────────────────────────────────────────────────
  // Thabang John Moreo runs Fastway operations (driver/mechanic) — salary attributed to Fastway.
  // Everyone else works the Opulent Beauty salon — their salaries attributed there.
  { name: 'Salary: Thabang John Moreo', descriptionPattern: 'THABANG JOHN MORE',
    category: 'Salaries / Wages', business: 'fastway',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Tunnel Mangozvana', descriptionPattern: 'TUNNEL MANGOZVAN',
    category: 'Salaries / Wages', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Irene Sarifo', descriptionPattern: 'IRENE SARIFO',
    category: 'Salaries / Wages', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: C Nyoni Charlotte', descriptionPattern: 'C NYONI',
    category: 'Salaries / Wages', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },
  { name: 'Salary: Tryness Tembo', descriptionPattern: 'TRYNESS TEMBO',
    category: 'Salaries / Wages', business: 'opulent-beauty',
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.STAFF },

  // ─── PERSONAL EXPENSES ─────────────────────────────────────────────────────
  { name: 'Personal: Planet Nails', descriptionPattern: 'PLANET NAILS',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  { name: 'Personal: Crazy Plastic', descriptionPattern: 'CRAZY PLASTIC',
    category: 'Personal Expense', isPersonal: true,
    transactionType: 'EXPENSE', trustedAutoReview: true, priority: P.SPECIFIC_MERCHANT },
  // Bling Girl — beauty supplier for the Opulent Beauty salon (NOT a personal expense)
  { name: 'Bling Girl — Opulent Beauty stock', descriptionPattern: 'BLING GIRL',
    category: 'Cost of Sales / Materials', business: 'opulent-beauty',
    isPersonal: false,
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

// Enriched notes to backfill onto existing base-seed suppliers (research from web)
const BASE_SUPPLIER_ENRICHMENT: Array<{ name: string; website?: string; notes: string }> = [
  { name: 'Pick n Pay', website: 'https://www.pnp.co.za',
    notes: 'Pick n Pay Stores Limited (JSE: PIK) — major SA retail group. Supermarkets, hypermarkets, online. Founded 1967 by Raymond Ackerman. HQ Kenilworth, Cape Town. Generally personal expense on this account.' },
  { name: 'Engen Petroleum', website: 'https://www.engen.co.za',
    notes: 'Engen Petroleum Limited — SA petroleum company (downstream brand). Parent company Vivo Energy (acquired 2018 from PETRONAS). HQ Cape Town. Parent of Engen Mankwe, Engen Sun City etc.' },
  { name: 'Vodacom', website: 'https://www.vodacom.co.za',
    notes: 'Vodacom Group Limited (JSE: VOD) — largest SA mobile network operator (~50m subscribers). Subsidiary of Vodafone Group. HQ Midrand. Charged via VAS prepaid top-ups for business mobile numbers.' },
  { name: 'Builders Warehouse', website: 'https://www.builders.co.za',
    notes: 'Builders Warehouse — Massmart\'s home improvement chain (Walmart-owned). DIY, building materials, hardware, tools, garden, paint. HQ Johannesburg.' },
  { name: 'Standard Bank', website: 'https://www.standardbank.co.za',
    notes: 'The Standard Bank of South Africa Limited (Reg No. 1962/000738/06, NCRCP15). VAT Reg No. 4100105461. Authorised financial services provider. Account 33 272 236 8 (BIZLAUNCH). All bank charge patterns map to this supplier.' },
  { name: 'Takealot', website: 'https://www.takealot.com',
    notes: 'Takealot.com — largest SA online retailer (subsidiary of Naspers/Prosus). Selling on marketplace ("Takealot Seller") was a 2023-mid-2025 revenue source for Kgolaentle. From late 2025 only seller-subscription debits remain. Note: direction matters — CREDIT entries are e-commerce revenue (legacy), DEBIT entries are subscription fees.' },
]

/**
 * Idempotently seed transaction rules + supporting suppliers and categories
 * into the database. Safe to re-run; existing rules are updated by [tenantId, name].
 */
export async function seedRules(prisma: PrismaClient): Promise<SeedRulesResult> {
  const warnings: string[] = []

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } })

  // Remove orphan rules from earlier seed iterations (names changed)
  // Safe because no transactions reference them yet — these were only just seeded today.
  const ORPHAN_RULE_NAMES = [
    'J Govender — Opulent Rent',
    'Trans Natal (no-dash variant)',
    'Trans-Natal Express (sub-contracted courier)',
    'Transnatal Glass Factory (homeware wholesale)',
    'Personal: Bling Girl', // renamed → "Bling Girl — Opulent Beauty stock"
  ]
  await prisma.transactionRule.deleteMany({
    where: { tenantId: tenant.id, name: { in: ORPHAN_RULE_NAMES } },
  })

  // Rename legacy "Trans-Natal Express" → "Transnatal Glass Factory" (research correction)
  // The original name was wrong — this is a homeware wholesaler, not a courier.
  const legacyTransNatal = await prisma.supplier.findFirst({
    where: { tenantId: tenant.id, name: 'Trans-Natal Express' },
    select: { id: true },
  })
  if (legacyTransNatal) {
    // Check if the corrected supplier already exists
    const existingCorrect = await prisma.supplier.findFirst({
      where: { tenantId: tenant.id, name: 'Transnatal Glass Factory' },
      select: { id: true },
    })
    if (existingCorrect) {
      // Already exists — delete the legacy one to avoid the unique constraint clash
      // (no transactions or rules reference it yet since it was just seeded)
      await prisma.supplierAlias.deleteMany({ where: { supplierId: legacyTransNatal.id } })
      await prisma.transactionRule.updateMany({
        where: { supplierId: legacyTransNatal.id },
        data: { supplierId: existingCorrect.id },
      })
      await prisma.supplier.delete({ where: { id: legacyTransNatal.id } })
    } else {
      await prisma.supplier.update({
        where: { id: legacyTransNatal.id },
        data: { name: 'Transnatal Glass Factory' },
      })
    }
  }

  // Enrich existing base-seed suppliers with research notes
  for (const def of BASE_SUPPLIER_ENRICHMENT) {
    const existing = await prisma.supplier.findFirst({
      where: { tenantId: tenant.id, name: def.name },
      select: { id: true },
    })
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: { website: def.website, notes: def.notes },
      })
    }
  }

  // Ensure new categories exist
  for (const cat of NEW_CATEGORIES) {
    await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: cat.name } },
      update: { categoryType: cat.categoryType, receiptRequired: cat.receiptRequired },
      create: { tenantId: tenant.id, ...cat },
    })
  }

  // Upsert suppliers with aliases + research notes
  const supplierIdByName: Record<string, string> = {}
  for (const def of SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
      update: { website: def.website ?? null, notes: def.notes ?? null },
      create: { tenantId: tenant.id, name: def.name, website: def.website, notes: def.notes },
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

  // Fetch ALL suppliers in this tenant so rules can reference base-seed
  // suppliers (Standard Bank, Vodacom, Pick n Pay, Engen Petroleum, Takealot,
  // Builders Warehouse) by name without needing them in the SUPPLIERS array.
  const allTenantSuppliers = await prisma.supplier.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
  })
  for (const s of allTenantSuppliers) {
    if (!supplierIdByName[s.name]) supplierIdByName[s.name] = s.id
  }

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
