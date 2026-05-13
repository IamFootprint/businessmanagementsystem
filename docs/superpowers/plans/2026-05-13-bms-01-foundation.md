# BMS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the BMS monorepo with a complete Prisma schema, seeded dev database, Hono API scaffold, and Next.js web scaffold — producing a working local dev environment before any feature work begins.

**Architecture:** pnpm workspaces + Turborepo monorepo with three packages: `packages/db` (Prisma schema + client, shared), `apps/api` (Hono MVC, Node.js), `apps/web` (Next.js App Router). All business logic lives in `apps/api`; `apps/web` calls the API via HTTP. Docker Compose runs Postgres locally.

**Tech Stack:** Node.js 22, pnpm 9, Turborepo, TypeScript 5, Prisma 6, PostgreSQL 16, Hono 4, Next.js 15, Vitest 2, Docker Compose

---

## File Map

```
BusinessManagementSystem/
├── package.json                          root workspace config
├── pnpm-workspace.yaml                   workspace package paths
├── turbo.json                            turborepo pipeline
├── docker-compose.yml                    Postgres + pgAdmin for dev
├── .env.example                          documented env vars
├── .gitignore
├── packages/
│   └── db/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma             full domain schema (all models)
│       │   └── seed.ts                  seeds tenant, businesses, bank account, categories, admin user
│       └── src/
│           └── index.ts                 exports PrismaClient singleton + re-exports generated types
└── apps/
    ├── api/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   └── src/
    │       ├── index.ts                 Node.js entry: serve(app, { port })
    │       ├── app.ts                   Hono app factory (no side effects, testable)
    │       ├── routes/
    │       │   └── index.ts             registers all route groups
    │       ├── controllers/
    │       │   └── health.controller.ts GET /health + GET /health/db
    │       └── __tests__/
    │           └── health.test.ts
    └── web/
        ├── package.json
        ├── tsconfig.json
        ├── next.config.ts
        └── app/
            ├── layout.tsx
            └── page.tsx                 server component: redirect to /login
```

---

## Task 1: Monorepo root scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1.1: Verify you are in the project root**

```bash
ls /Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle\ Holdings/Solutions/Projects/BusinessManagementSystem
```

Expected: `docs/` directory and any env/git leftovers. No `package.json` yet.

- [ ] **Step 1.2: Create root `package.json`**

```json
{
  "name": "bms",
  "private": true,
  "version": "0.0.1",
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=22",
    "pnpm": ">=9"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter db migrate:dev",
    "db:seed": "pnpm --filter db seed",
    "db:reset": "pnpm --filter db migrate:reset"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 1.3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 1.4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL", "DATABASE_URL_TEST"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 1.5: Create `.gitignore`**

```
node_modules/
.env
.env.local
.next/
dist/
*.tsbuildinfo
.turbo/
```

- [ ] **Step 1.6: Create `.env.example`**

```
# Postgres — local Docker
DATABASE_URL="postgresql://bms:bms@localhost:5432/bms_dev"
DATABASE_URL_TEST="postgresql://bms:bms@localhost:5432/bms_test"

# API
API_PORT=3001
API_SECRET="change-me-in-production"
SESSION_SECRET="change-me-in-production"

# Web
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Storage (Cloudflare R2 or local)
STORAGE_PROVIDER="local"
STORAGE_LOCAL_DIR="./uploads"

# WhatsApp (Meta Cloud API) — leave blank until Plan 7
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
```

- [ ] **Step 1.7: Install root devDependencies**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm install
```

Expected: `node_modules/` created at root, lockfile written.

- [ ] **Step 1.8: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .gitignore .env.example pnpm-lock.yaml
git commit -m "chore: initialise pnpm + turborepo monorepo"
```

---

## Task 2: `packages/db` — Prisma schema

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

- [ ] **Step 2.1: Create package directory**

```bash
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/packages/db/prisma"
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/packages/db/src"
```

- [ ] **Step 2.2: Create `packages/db/package.json`**

```json
{
  "name": "@bms/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "scripts": {
    "migrate:dev": "prisma migrate dev --schema=./prisma/schema.prisma",
    "migrate:deploy": "prisma migrate deploy --schema=./prisma/schema.prisma",
    "migrate:reset": "prisma migrate reset --schema=./prisma/schema.prisma --force",
    "seed": "tsx prisma/seed.ts",
    "generate": "prisma generate --schema=./prisma/schema.prisma",
    "studio": "prisma studio --schema=./prisma/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "^6.2.1"
  },
  "devDependencies": {
    "prisma": "^6.2.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2.3: Create `packages/db/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src", "prisma"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2.4: Create `packages/db/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── TENANCY ─────────────────────────────────────────────────────────────────

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  businesses    Business[]
  bankAccounts  BankAccount[]
  users         User[]
  suppliers     Supplier[]
  categories    Category[]
  rules         TransactionRule[]
  featureFlags  FeatureFlag[]
}

model Business {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  slug      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant             Tenant             @relation(fields: [tenantId], references: [id])
  transactions       Transaction[]
  monthlyPeriods     MonthlyPeriod[]
  supplierBusinesses SupplierBusiness[]
  rules              TransactionRule[]

  @@unique([tenantId, slug])
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

enum UserRole {
  TENANT_OWNER
  FINANCE_MANAGER
  ACCOUNTANT
  AUDITOR
}

model User {
  id           String    @id @default(cuid())
  tenantId     String
  email        String    @unique
  passwordHash String
  name         String
  role         UserRole
  active       Boolean   @default(true)
  phone        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastLoginAt  DateTime?

  tenant                Tenant                  @relation(fields: [tenantId], references: [id])
  sessions              Session[]
  statementImports      StatementImport[]
  transactionAuditEvents TransactionAuditEvent[]
  receiptsUploaded      Receipt[]               @relation("ReceiptUploadedBy")
  receiptMatches        Receipt[]               @relation("ReceiptMatchedBy")
  monthlyPeriodEvents   MonthlyPeriodEvent[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── BANK ACCOUNTS ────────────────────────────────────────────────────────────

model BankAccount {
  id          String   @id @default(cuid())
  tenantId    String
  nickname    String
  bankName    String
  accountType String
  lastFour    String?
  currency    String   @default("ZAR")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant           Tenant            @relation(fields: [tenantId], references: [id])
  statementImports StatementImport[]
  transactions     Transaction[]
}

// ─── STATEMENT IMPORTS ────────────────────────────────────────────────────────

enum ImportStatus {
  PROCESSING
  COMPLETE
  FAILED
}

model StatementImport {
  id              String       @id @default(cuid())
  bankAccountId   String
  importedById    String
  fileName        String
  fileHash        String
  rowCount        Int
  importedCount   Int          @default(0)
  duplicateCount  Int          @default(0)
  errorCount      Int          @default(0)
  skippedCount    Int          @default(0)
  status          ImportStatus @default(PROCESSING)
  openingBalanceCents Int?
  closingBalanceCents Int?
  periodStart     DateTime?
  periodEnd       DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  bankAccount  BankAccount          @relation(fields: [bankAccountId], references: [id])
  importedBy   User                 @relation(fields: [importedById], references: [id])
  rows         StatementImportRow[]
  transactions Transaction[]
}

enum ImportRowAction {
  IMPORTED
  DUPLICATE_SKIPPED
  OPENING_BALANCE
  ERROR
}

model StatementImportRow {
  id            String          @id @default(cuid())
  importId      String
  rowNumber     Int
  rawJson       Json
  duplicateHash String?
  action        ImportRowAction
  errorMessage  String?
  transactionId String?         @unique
  createdAt     DateTime        @default(now())

  import      StatementImport @relation(fields: [importId], references: [id], onDelete: Cascade)
  transaction Transaction?    @relation(fields: [transactionId], references: [id])
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

enum TransactionDirection {
  CREDIT
  DEBIT
}

enum TransactionType {
  REVENUE
  EXPENSE
  TRANSFER
  OWNER_DRAW
  DIRECTOR_LOAN
  REFUND
  BANK_CHARGE
  TAX
  UNKNOWN
}

enum ReviewStatus {
  NEEDS_REVIEW
  REVIEWED
  UNCLEAR
  LOCKED
}

model Transaction {
  id                String               @id @default(cuid())
  bankAccountId     String
  importId          String
  businessId        String?
  supplierId        String?
  categoryId        String?
  refundCategoryId  String?
  ruleId            String?

  transactionDate   DateTime
  rawDescription    String
  cleanDescription  String
  amountCents       Int
  balanceAfterCents Int
  duplicateHash     String               @unique
  csvRowNumber      Int

  direction         TransactionDirection
  transactionType   TransactionType      @default(UNKNOWN)
  isPersonal        Boolean              @default(false)
  notes             String?

  reviewStatus      ReviewStatus         @default(NEEDS_REVIEW)
  reviewedById      String?
  reviewedAt        DateTime?

  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  bankAccount    BankAccount           @relation(fields: [bankAccountId], references: [id])
  import         StatementImport       @relation(fields: [importId], references: [id])
  business       Business?             @relation(fields: [businessId], references: [id])
  supplier       Supplier?             @relation(fields: [supplierId], references: [id])
  category       Category?             @relation("TransactionCategory", fields: [categoryId], references: [id])
  refundCategory Category?             @relation("RefundCategory", fields: [refundCategoryId], references: [id])
  rule           TransactionRule?      @relation(fields: [ruleId], references: [id])
  importRow      StatementImportRow?
  receipts       Receipt[]
  auditEvents    TransactionAuditEvent[]
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

enum CategoryType {
  REVENUE
  EXPENSE
  TRANSFER
  OWNER
  LOAN
  TAX
  UNKNOWN
}

model Category {
  id              String       @id @default(cuid())
  tenantId        String
  categoryType    CategoryType
  name            String
  receiptRequired Boolean      @default(false)
  active          Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  tenant             Tenant            @relation(fields: [tenantId], references: [id])
  transactions       Transaction[]     @relation("TransactionCategory")
  refundTransactions Transaction[]     @relation("RefundCategory")
  rules              TransactionRule[]

  @@unique([tenantId, name])
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

model Supplier {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  website   String?
  notes     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant       Tenant             @relation(fields: [tenantId], references: [id])
  businesses   SupplierBusiness[]
  aliases      SupplierAlias[]
  transactions Transaction[]
  rules        TransactionRule[]

  @@unique([tenantId, name])
}

model SupplierBusiness {
  id                     String           @id @default(cuid())
  supplierId             String
  businessId             String
  defaultCategoryId      String?
  defaultTransactionType TransactionType?
  receiptRequired        Boolean          @default(false)
  active                 Boolean          @default(true)
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt

  supplier Supplier @relation(fields: [supplierId], references: [id])
  business Business @relation(fields: [businessId], references: [id])

  @@unique([supplierId, businessId])
}

model SupplierAlias {
  id         String   @id @default(cuid())
  supplierId String
  pattern    String
  createdAt  DateTime @default(now())

  supplier Supplier @relation(fields: [supplierId], references: [id])

  @@unique([supplierId, pattern])
}

// ─── TRANSACTION RULES ────────────────────────────────────────────────────────

model TransactionRule {
  id                  String           @id @default(cuid())
  tenantId            String
  name                String
  descriptionPattern  String
  businessId          String?
  supplierId          String?
  categoryId          String?
  transactionType     TransactionType?
  isPersonal          Boolean?
  receiptRequired     Boolean?
  trustedAutoReview   Boolean          @default(false)
  active              Boolean          @default(true)
  priority            Int              @default(0)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  business     Business?     @relation(fields: [businessId], references: [id])
  supplier     Supplier?     @relation(fields: [supplierId], references: [id])
  category     Category?     @relation(fields: [categoryId], references: [id])
  transactions Transaction[]
}

// ─── RECEIPTS ─────────────────────────────────────────────────────────────────

enum ReceiptMatchStatus {
  UNMATCHED
  SUGGESTED
  MATCHED
  STALE
}

model Receipt {
  id             String             @id @default(cuid())
  transactionId  String?
  uploadedById   String?
  matchedById    String?

  uploaderPhone  String
  uploaderLat    Float?
  uploaderLng    Float?
  capturedAt     DateTime           @default(now())

  hintAmountCents Int?
  hintDate        DateTime?
  hintSupplier    String?
  hintBusinessId  String?

  storagePath    String
  fileName       String
  fileMimeType   String
  fileSizeBytes  Int

  matchStatus    ReceiptMatchStatus @default(UNMATCHED)
  matchScore     Float?
  matchedAt      DateTime?
  isStale        Boolean            @default(false)

  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  transaction Transaction? @relation(fields: [transactionId], references: [id])
  uploadedBy  User?        @relation("ReceiptUploadedBy", fields: [uploadedById], references: [id])
  matchedBy   User?        @relation("ReceiptMatchedBy", fields: [matchedById], references: [id])
}

// ─── MONTHLY PERIODS ──────────────────────────────────────────────────────────

enum PeriodStatus {
  OPEN
  LOCKED
}

model MonthlyPeriod {
  id         String       @id @default(cuid())
  businessId String
  year       Int
  month      Int
  status     PeriodStatus @default(OPEN)
  lockedAt   DateTime?
  lockedById String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  business Business              @relation(fields: [businessId], references: [id])
  events   MonthlyPeriodEvent[]
  snapshot ReportSnapshot?

  @@unique([businessId, year, month])
}

model MonthlyPeriodEvent {
  id        String   @id @default(cuid())
  periodId  String
  actorId   String
  action    String
  reason    String?
  createdAt DateTime @default(now())

  period MonthlyPeriod @relation(fields: [periodId], references: [id])
  actor  User          @relation(fields: [actorId], references: [id])
}

model ReportSnapshot {
  id           String   @id @default(cuid())
  periodId     String   @unique
  snapshotJson Json
  createdAt    DateTime @default(now())

  period MonthlyPeriod @relation(fields: [periodId], references: [id])
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────

model TransactionAuditEvent {
  id            String   @id @default(cuid())
  transactionId String
  actorId       String?
  action        String
  before        Json?
  after         Json?
  createdAt     DateTime @default(now())

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  actor       User?       @relation(fields: [actorId], references: [id])
}

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────────

model FeatureFlag {
  id        String   @id @default(cuid())
  tenantId  String
  key       String
  enabled   Boolean  @default(false)
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, key])
}
```

- [ ] **Step 2.5: Create `packages/db/src/index.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'
```

- [ ] **Step 2.6: Install packages/db dependencies**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm install
```

- [ ] **Step 2.7: Commit**

```bash
git add packages/db/
git commit -m "feat(db): add prisma schema with all BMS domain models"
```

---

## Task 3: Docker dev environment

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 3.1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: bms
      POSTGRES_PASSWORD: bms
      POSTGRES_DB: bms_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql

  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@kgolaentle.com
      PGADMIN_DEFAULT_PASSWORD: bms
    ports:
      - '5050:80'
    depends_on:
      - postgres

volumes:
  postgres_data:
```

- [ ] **Step 3.2: Create `docker/init.sql`** (creates test database alongside dev)

```bash
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/docker"
```

```sql
-- docker/init.sql
CREATE DATABASE bms_test;
GRANT ALL PRIVILEGES ON DATABASE bms_test TO bms;
```

- [ ] **Step 3.3: Create `.env` from example**

```bash
cp .env.example .env
```

- [ ] **Step 3.4: Start Postgres**

```bash
docker compose up -d postgres
```

Expected output: container `businessmanagementsystem-postgres-1` started.

- [ ] **Step 3.5: Verify Postgres is running**

```bash
docker compose ps
```

Expected: postgres service `Up`, port `0.0.0.0:5432->5432/tcp`.

- [ ] **Step 3.6: Commit**

```bash
git add docker-compose.yml docker/init.sql
git commit -m "chore: add docker compose for local postgres dev environment"
```

---

## Task 4: Initial migration and seed data

**Files:**
- Create: `packages/db/prisma/seed.ts`

- [ ] **Step 4.1: Run initial migration**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm db:migrate
```

When prompted for migration name, enter: `init`

Expected: migration file created in `packages/db/prisma/migrations/`, Prisma client generated.

- [ ] **Step 4.2: Create `packages/db/prisma/seed.ts`**

```typescript
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

  const businesses: Record<string, string> = {}
  for (const def of businessDefs) {
    const b = await prisma.business.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: def.slug } },
      update: {},
      create: { tenantId: tenant.id, ...def },
    })
    businesses[def.slug] = b.id
    console.log(`  Business: ${b.name}`)
  }

  // ── Bank account ─────────────────────────────────────────────────────────────
  await prisma.bankAccount.upsert({
    where: {
      id: `seed-stdbank-main`,
    },
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

  // ── Initial admin user (dev only — override with env vars in staging/prod) ───
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'owner@kgolaentle.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123!'
  const { createHash } = crypto
  const passwordHash = createHash('sha256').update(adminPassword).digest('hex') // replaced with bcrypt in Plan 2

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      name: 'Owner',
      role: 'TENANT_OWNER' as UserRole,
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
```

> **Note:** The seed uses SHA-256 as a placeholder hash — Plan 2 (Auth) replaces this with bcrypt. The comment makes this explicit.

- [ ] **Step 4.3: Add seed script reference to `packages/db/package.json` prisma block**

Add to `packages/db/package.json` at the top level (alongside `"scripts"`):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4.4: Run seed**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm db:seed
```

Expected output:
```
Seeding BMS database...
Tenant: Kgolaentle Holdings
  Business: Fastway Courier
  Business: Opulent Beauty
  Business: Opulent Homeware
  Business: Kgolaentle Holdings
Bank account: Standard Bank Main
Categories: 33 seeded
Admin user: owner@kgolaentle.com
Seed complete.
```

- [ ] **Step 4.5: Verify seed via psql**

```bash
docker compose exec postgres psql -U bms -d bms_dev -c "SELECT name, slug FROM \"Business\";"
```

Expected: 4 rows (Fastway Courier, Opulent Beauty, Opulent Homeware, Kgolaentle Holdings).

- [ ] **Step 4.6: Commit**

```bash
git add packages/db/prisma/seed.ts packages/db/package.json packages/db/prisma/migrations/
git commit -m "feat(db): add initial migration and seed data (tenant, businesses, bank account, categories)"
```

---

## Task 5: `packages/db` tests

**Files:**
- Create: `packages/db/src/__tests__/seed.test.ts`
- Modify: `packages/db/package.json` (add test script)

- [ ] **Step 5.1: Add Vitest to `packages/db/package.json`**

Add to `devDependencies`:
```json
"vitest": "^2.1.8"
```

Add to `scripts`:
```json
"test": "vitest run"
```

Add vitest config block at the top level of `packages/db/package.json`:
```json
"vitest": {
  "environment": "node"
}
```

Then install:
```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm install
```

- [ ] **Step 5.2: Write failing test**

Create `packages/db/src/__tests__/seed.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL } },
})

afterAll(() => prisma.$disconnect())

describe('seed data', () => {
  it('tenant Kgolaentle Holdings exists', async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'kgolaentle-holdings' } })
    expect(tenant).not.toBeNull()
    expect(tenant?.name).toBe('Kgolaentle Holdings')
  })

  it('four businesses are seeded', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const count = await prisma.business.count({ where: { tenantId: tenant.id } })
    expect(count).toBe(4)
  })

  it('Standard Bank Main account exists', async () => {
    const account = await prisma.bankAccount.findUnique({ where: { id: 'seed-stdbank-main' } })
    expect(account).not.toBeNull()
    expect(account?.bankName).toBe('Standard Bank')
  })

  it('Uncategorised category exists', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const cat = await prisma.category.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Uncategorised' } },
    })
    expect(cat).not.toBeNull()
    expect(cat?.categoryType).toBe('UNKNOWN')
  })

  it('at least one TENANT_OWNER user exists', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kgolaentle-holdings' } })
    const owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'TENANT_OWNER' },
    })
    expect(owner).not.toBeNull()
  })
})
```

- [ ] **Step 5.3: Run test — expect FAIL (test DB needs migration)**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
DATABASE_URL="postgresql://bms:bms@localhost:5432/bms_test" pnpm --filter db migrate:deploy
DATABASE_URL="postgresql://bms:bms@localhost:5432/bms_test" SEED_ADMIN_EMAIL="owner@kgolaentle.com" pnpm --filter db seed
```

Then run tests:
```bash
DATABASE_URL="postgresql://bms:bms@localhost:5432/bms_test" pnpm --filter db test
```

Expected: all 5 tests PASS.

- [ ] **Step 5.4: Commit**

```bash
git add packages/db/src/__tests__/ packages/db/package.json
git commit -m "test(db): verify seed data integrity against test database"
```

---

## Task 6: `apps/api` — Hono MVC scaffold

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/routes/index.ts`
- Create: `apps/api/src/controllers/health.controller.ts`
- Create: `apps/api/src/__tests__/health.test.ts`

- [ ] **Step 6.1: Create directory structure**

```bash
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api/src/controllers"
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api/src/routes"
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/api/src/__tests__"
```

- [ ] **Step 6.2: Create `apps/api/package.json`**

```json
{
  "name": "@bms/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@bms/db": "workspace:*",
    "@hono/node-server": "^1.13.7",
    "hono": "^4.6.20"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 6.3: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6.4: Create `apps/api/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://bms:bms@localhost:5432/bms_test',
    },
  },
})
```

- [ ] **Step 6.5: Write failing test**

Create `apps/api/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { app } from '../app'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})

describe('GET /health/db', () => {
  it('returns 200 when database is reachable', async () => {
    const res = await app.request('/health/db')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.latencyMs).toBe('number')
  })
})
```

- [ ] **Step 6.6: Run test — expect FAIL**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm install
pnpm --filter api test
```

Expected: `Cannot find module '../app'`

- [ ] **Step 6.7: Create `apps/api/src/controllers/health.controller.ts`**

```typescript
import { Context } from 'hono'
import { prisma } from '@bms/db'

export async function getHealth(c: Context) {
  return c.json({ status: 'ok' })
}

export async function getDbHealth(c: Context) {
  const start = Date.now()
  await prisma.$queryRaw`SELECT 1`
  return c.json({ status: 'ok', latencyMs: Date.now() - start })
}
```

- [ ] **Step 6.8: Create `apps/api/src/routes/index.ts`**

```typescript
import { Hono } from 'hono'
import { getHealth, getDbHealth } from '../controllers/health.controller'

export function registerRoutes(app: Hono) {
  app.get('/health', getHealth)
  app.get('/health/db', getDbHealth)
}
```

- [ ] **Step 6.9: Create `apps/api/src/app.ts`**

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { registerRoutes } from './routes/index'

export function createApp() {
  const app = new Hono()
  app.use('*', logger())
  registerRoutes(app)
  return app
}

export const app = createApp()
```

- [ ] **Step 6.10: Create `apps/api/src/index.ts`**

```typescript
import { serve } from '@hono/node-server'
import { app } from './app'

const port = Number(process.env.API_PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})
```

- [ ] **Step 6.11: Run tests — expect PASS**

```bash
pnpm --filter api test
```

Expected:
```
✓ GET /health > returns 200 with status ok
✓ GET /health/db > returns 200 when database is reachable
```

- [ ] **Step 6.12: Smoke test the running API**

```bash
pnpm --filter api dev &
sleep 3
curl http://localhost:3001/health
curl http://localhost:3001/health/db
```

Expected:
```json
{"status":"ok"}
{"status":"ok","latencyMs":2}
```

- [ ] **Step 6.13: Commit**

```bash
git add apps/api/
git commit -m "feat(api): scaffold hono mvc app with health endpoints"
```

---

## Task 7: `apps/web` — Next.js scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/lib/api-client.ts`

- [ ] **Step 7.1: Create directory structure**

```bash
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/web/app"
mkdir -p "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem/apps/web/lib"
```

- [ ] **Step 7.2: Create `apps/web/package.json`**

```json
{
  "name": "@bms/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 7.3: Create `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7.4: Create `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
}

export default nextConfig
```

- [ ] **Step 7.5: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BMS — Kgolaentle Holdings',
  description: 'Business Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7.6: Create `apps/web/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
```

- [ ] **Step 7.7: Create `apps/web/lib/api-client.ts`**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message?: string }).message ?? res.statusText)
  }

  return res.json() as Promise<T>
}
```

- [ ] **Step 7.8: Install web dependencies**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
pnpm install
```

- [ ] **Step 7.9: Verify web builds without errors**

```bash
pnpm --filter web build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7.10: Commit**

```bash
git add apps/web/
git commit -m "feat(web): scaffold next.js app with root redirect to /login"
```

---

## Task 8: Final integration check

- [ ] **Step 8.1: Run full test suite**

```bash
cd "/Users/shimane/Library/CloudStorage/Dropbox/KgolaEntle Holdings/Solutions/Projects/BusinessManagementSystem"
DATABASE_URL="postgresql://bms:bms@localhost:5432/bms_test" pnpm test
```

Expected:
```
@bms/db: 5 passed
@bms/api: 2 passed
```

- [ ] **Step 8.2: Start all services**

```bash
pnpm dev
```

Expected:
- API on `http://localhost:3001`
- Web on `http://localhost:3000` (redirects to `/login`)

- [ ] **Step 8.3: Verify redirect**

Open `http://localhost:3000` in a browser — it should redirect to `http://localhost:3000/login` (404 is fine; login page doesn't exist yet — that's Plan 2).

- [ ] **Step 8.4: Final commit**

```bash
git add .
git commit -m "chore: verify full monorepo dev environment is operational"
```

---

## Self-Review

**Spec coverage check:**

| Decision | Covered |
|---|---|
| pnpm workspaces + Turborepo | Task 1 |
| apps/api Hono MVC | Task 6 |
| apps/web Next.js | Task 7 |
| packages/db Prisma shared | Task 2 |
| PostgreSQL portable (no D1) | Task 2, 3 |
| Full domain schema (all models) | Task 2 |
| Seed: tenant, businesses, bank account, categories | Task 4 |
| Fastway as default/first business | Task 4 (seeded first) |
| S3-compatible storage adapter | Noted in .env.example; implementation in Plan 5 (Receipts) |
| @kgolaentle.com auth | Plan 2 (this plan reserves User + Session models) |
| Integer cents for amounts | schema.prisma ✓ |
| Signed amounts | schema.prisma ✓ (amountCents: Int, no unsigned constraint) |
| transaction_type separate from category | schema.prisma ✓ |
| Two-level categories | schema.prisma (categoryType + name) ✓ |
| Fastway-specific categories seeded | Task 4 ✓ |
| Receipt match status fields | schema.prisma ✓ |
| Monthly period lock/unlock | schema.prisma ✓ |
| Audit events | TransactionAuditEvent model ✓ |
| Feature flags | FeatureFlag model ✓ |

**No placeholders found.**

**Type consistency:** `@bms/db` exports `PrismaClient` and all generated types. `apps/api` imports from `@bms/db` consistently. No cross-plan type mismatches in this plan.

---

## What comes next

- **Plan 2 — Auth & Sessions:** bcrypt password hashing, POST /auth/login, POST /auth/logout, session middleware, @kgolaentle.com enforcement, role middleware, login page
- **Plan 3 — Import Engine:** CSV parser, duplicate hash, transaction creation, import summary
- **Plan 4 — Transaction Review & Rules**
- **Plan 5 — Receipts**
- **Plan 6 — Reporting & Month Close**
- **Plan 7 — Notifications (WhatsApp)**
