# BMS Frontend Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply production-quality frontend design to all BMS web app pages using Tailwind CSS 4 and shadcn-style UI primitives, replacing all inline styles with a coherent internal-tool design system built around a persistent sidebar shell.

**Architecture:** Install Tailwind CSS 4 (`@tailwindcss/postcss`) in `apps/web`. Define design tokens in `globals.css` via `@theme`. Manually create shadcn-style UI primitives (Button, Card, Badge, Input, Label, Table, Separator, Skeleton) that consume those tokens via Tailwind utilities. Build a persistent sidebar + topbar dashboard shell in `app/dashboard/layout.tsx`. Redesign all 9 pages without touching any API logic or server actions — pure presentation layer. No dark mode for MVP; internal tool is desktop-only light mode.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4 (`@tailwindcss/postcss`), `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-slot`, Inter (`next/font/google`)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/postcss.config.mjs` | Create | PostCSS with `@tailwindcss/postcss` |
| `apps/web/app/globals.css` | Create | `@import "tailwindcss"` + `@theme` tokens |
| `apps/web/lib/utils.ts` | Create | `cn()` (clsx + tailwind-merge) |
| `apps/web/components/ui/button.tsx` | Create | Button primitive (variants: default, outline, ghost, destructive) |
| `apps/web/components/ui/card.tsx` | Create | Card, CardHeader, CardContent, CardTitle, CardDescription |
| `apps/web/components/ui/badge.tsx` | Create | Badge (variants: default, secondary, outline, success, warning, destructive) |
| `apps/web/components/ui/input.tsx` | Create | Input primitive |
| `apps/web/components/ui/label.tsx` | Create | Label primitive |
| `apps/web/components/ui/table.tsx` | Create | Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| `apps/web/components/ui/separator.tsx` | Create | Separator (thin hr) |
| `apps/web/components/ui/skeleton.tsx` | Create | Skeleton loader |
| `apps/web/components/layout/Sidebar.tsx` | Create | Left nav sidebar (server component) |
| `apps/web/app/layout.tsx` | Modify | Import globals.css + Inter font |
| `apps/web/app/(auth)/layout.tsx` | Create | Centered card wrapper for login |
| `apps/web/app/dashboard/layout.tsx` | Create | Sidebar + content shell |
| `apps/web/app/(auth)/login/page.tsx` | Modify | Restyled login form |
| `apps/web/app/dashboard/page.tsx` | Modify | Navigation cards dashboard home |
| `apps/web/app/dashboard/transactions/page.tsx` | Modify | Filter tabs + data table |
| `apps/web/app/dashboard/import/page.tsx` | Modify | Upload card |
| `apps/web/app/dashboard/suppliers/page.tsx` | Modify | Supplier list |
| `apps/web/app/dashboard/receipts/page.tsx` | Modify | Receipt inbox with status badges |
| `apps/web/app/dashboard/reports/page.tsx` | Modify | Period list |
| `apps/web/app/dashboard/reports/[periodId]/page.tsx` | Modify | P&L report detail |
| `apps/web/app/receipts/upload/page.tsx` | Modify | Public upload card (standalone) |
| `apps/web/app/receipts/upload/UploadReceiptForm.tsx` | Modify | Styled upload form |

---

### Task 1: Install packages and configure Tailwind CSS 4

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/lib/utils.ts`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Install Tailwind CSS 4 and UI utility packages**

```bash
cd apps/web && pnpm add tailwindcss @tailwindcss/postcss clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-slot
```

Expected: `pnpm` prints added packages, no errors.

- [ ] **Step 2: Create PostCSS config**

```js
// apps/web/postcss.config.mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

- [ ] **Step 3: Create globals.css with design tokens**

```css
/* apps/web/app/globals.css */
@import "tailwindcss";
@source "../**/*.{js,ts,jsx,tsx}";

@theme {
  /* Typography */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* Surfaces */
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;

  /* Brand / Primary */
  --color-primary: #4f46e5;
  --color-primary-foreground: #ffffff;
  --color-primary-hover: #4338ca;

  /* Neutral */
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #4f46e5;

  /* Semantic */
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-success: #16a34a;
  --color-success-foreground: #ffffff;
  --color-warning: #d97706;
  --color-warning-foreground: #ffffff;

  /* Sidebar */
  --color-sidebar: #0f172a;
  --color-sidebar-foreground: #e2e8f0;
  --color-sidebar-muted: #94a3b8;
  --color-sidebar-active: #4f46e5;
  --color-sidebar-active-fg: #ffffff;
  --color-sidebar-hover: #1e293b;

  /* Radius */
  --radius: 0.5rem;
}

@layer base {
  * {
    box-sizing: border-box;
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 4: Create lib/utils.ts**

```typescript
// apps/web/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Update root layout to import globals.css and Inter font**

```tsx
// apps/web/app/layout.tsx
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'BMS — Kgolaentle Holdings',
  description: 'Business Management System',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Verify build compiles**

```bash
cd apps/web && pnpm build
```

Expected: build completes with no TypeScript or CSS errors.

- [ ] **Step 7: Commit**

```bash
git -C ../.. add apps/web/postcss.config.mjs apps/web/app/globals.css apps/web/lib/utils.ts apps/web/app/layout.tsx apps/web/package.json apps/web/pnpm-lock.yaml
git -C ../.. commit -m "feat(web): install Tailwind CSS 4 and configure design tokens"
```

---

### Task 2: UI primitives

**Files:**
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/card.tsx`
- Create: `apps/web/components/ui/badge.tsx`
- Create: `apps/web/components/ui/input.tsx`
- Create: `apps/web/components/ui/label.tsx`
- Create: `apps/web/components/ui/table.tsx`
- Create: `apps/web/components/ui/separator.tsx`
- Create: `apps/web/components/ui/skeleton.tsx`

- [ ] **Step 1: Create Button**

```tsx
// apps/web/components/ui/button.tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:opacity-90',
        outline:
          'border border-border bg-card text-foreground hover:bg-muted',
        ghost:
          'text-foreground hover:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground hover:opacity-90',
        secondary:
          'bg-muted text-foreground hover:bg-muted/80',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 2: Create Card**

```tsx
// apps/web/components/ui/card.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-xs', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 3: Create Badge**

```tsx
// apps/web/components/ui/badge.tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-muted text-muted-foreground',
        outline: 'border border-border text-foreground',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        destructive: 'bg-red-100 text-red-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 4: Create Input**

```tsx
// apps/web/components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-1 text-sm text-foreground shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 5: Create Label**

```tsx
// apps/web/components/ui/label.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none text-foreground', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
```

- [ ] **Step 6: Create Table**

```tsx
// apps/web/components/ui/table.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
  )
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-b border-border transition-colors hover:bg-muted/50', className)}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />
  )
)
TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 7: Create Separator and Skeleton**

```tsx
// apps/web/components/ui/separator.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    {...props}
  />
))
Separator.displayName = 'Separator'

export { Separator }
```

```tsx
// apps/web/components/ui/skeleton.tsx
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius)] bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 8: Verify build**

```bash
cd apps/web && pnpm build
```

Expected: no TypeScript or import errors.

- [ ] **Step 9: Commit**

```bash
git -C ../.. add apps/web/components/
git -C ../.. commit -m "feat(web): add shadcn-style UI primitives"
```

---

### Task 3: Dashboard layout shell and Sidebar

**Files:**
- Create: `apps/web/components/layout/Sidebar.tsx`
- Create: `apps/web/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the Sidebar component**

```tsx
// apps/web/components/layout/Sidebar.tsx
import Link from 'next/link'
import {
  LayoutDashboard,
  ArrowUpFromLine,
  ListFilter,
  Building2,
  Receipt,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ListFilter },
  { href: '/dashboard/import', label: 'Import', icon: ArrowUpFromLine },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar({ activePath }: { activePath: string }) {
  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-sidebar-hover px-5">
        <div>
          <p className="text-sm font-bold tracking-wide text-sidebar-foreground">BMS</p>
          <p className="text-[10px] text-sidebar-muted">Kgolaentle Holdings</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = activePath === href || (href !== '/dashboard' && activePath.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-fg'
                  : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-hover p-2">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
```

Note: `--color-sidebar-hover` is `#1e293b` (slate-800). Add it to globals.css `@theme`:
```css
--color-sidebar-hover: #1e293b;
```

Also add `--color-sidebar-active-fg` which was declared in the theme already.

- [ ] **Step 2: Add missing sidebar-hover token to globals.css**

In `apps/web/app/globals.css`, inside `@theme { }`, the line `--color-sidebar-active: #4f46e5;` is already present. Add `--color-sidebar-hover` right after it:

Current content (excerpt):
```css
  --color-sidebar-active: #4f46e5;
  --color-sidebar-active-fg: #ffffff;
  --color-sidebar-hover: #1e293b;
```

This is already present from Task 1 Step 3. Verify: `grep -n "sidebar-hover" apps/web/app/globals.css`

Expected: prints a line with `--color-sidebar-hover: #1e293b;`

- [ ] **Step 3: Create the dashboard layout**

The layout reads the current path from `next/navigation` headers to highlight the active nav item. Since this is a server component, use `headers()` to get the `x-pathname` or a different approach. Because Next.js server layouts don't get `pathname` directly, pass the active path via a client wrapper, OR use the simpler approach: server component with `usePathname()` in a client component.

Use a client Sidebar wrapper:

```tsx
// apps/web/components/layout/SidebarNav.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function SidebarNav() {
  const pathname = usePathname()
  return <Sidebar activePath={pathname} />
}
```

```tsx
// apps/web/app/dashboard/layout.tsx
import type { ReactNode } from 'react'
import { SidebarNav } from '@/components/layout/SidebarNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create SidebarNav.tsx**

```tsx
// apps/web/components/layout/SidebarNav.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function SidebarNav() {
  const pathname = usePathname()
  return <Sidebar activePath={pathname} />
}
```

- [ ] **Step 5: Verify build**

```bash
cd apps/web && pnpm build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git -C ../.. add apps/web/components/layout/ apps/web/app/dashboard/layout.tsx
git -C ../.. commit -m "feat(web): add sidebar nav and dashboard layout shell"
```

---

### Task 4: Auth layout and Login page

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Modify: `apps/web/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create auth layout**

```tsx
// apps/web/app/(auth)/layout.tsx
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Restyle the login page**

```tsx
// apps/web/app/(auth)/login/page.tsx
'use client'
import { useActionState } from 'react'
import { loginAction } from './actions'
import type { LoginState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">BMS</p>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Kgolaentle Holdings internal system</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@kgolaentle.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && pnpm build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C ../.. add apps/web/app/\(auth\)/
git -C ../.. commit -m "feat(web): restyle auth layout and login page"
```

---

### Task 5: Dashboard home

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Restyle dashboard home with navigation cards**

```tsx
// apps/web/app/dashboard/page.tsx
import Link from 'next/link'
import { ArrowUpFromLine, ListFilter, Building2, Receipt, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARDS = [
  {
    href: '/dashboard/transactions?reviewStatus=NEEDS_REVIEW',
    icon: ListFilter,
    title: 'Transaction Review',
    description: 'Categorise and approve imported bank transactions',
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    href: '/dashboard/import',
    icon: ArrowUpFromLine,
    title: 'Import Statement',
    description: 'Upload a Standard Bank CSV to add new transactions',
    accent: 'text-primary',
    bg: 'bg-primary/5',
  },
  {
    href: '/dashboard/receipts',
    icon: Receipt,
    title: 'Receipt Inbox',
    description: 'Match field receipts to imported transactions',
    accent: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    href: '/dashboard/suppliers',
    icon: Building2,
    title: 'Suppliers',
    description: 'Manage supplier records and description aliases',
    accent: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  {
    href: '/dashboard/reports',
    icon: BarChart3,
    title: 'Reports',
    description: 'Lock monthly periods and download P&L exports',
    accent: 'text-green-600',
    bg: 'bg-green-50',
  },
] as const

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kgolaentle Holdings — Business Management System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, icon: Icon, title, description, accent, bg }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${accent}`} />
                </div>
                <CardTitle className="text-base group-hover:text-primary">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/page.tsx
git -C ../.. commit -m "feat(web): restyle dashboard home with navigation cards"
```

---

### Task 6: Transactions page

**Files:**
- Modify: `apps/web/app/dashboard/transactions/page.tsx`

- [ ] **Step 1: Restyle transactions page**

Replace the entire file content:

```tsx
// apps/web/app/dashboard/transactions/page.tsx
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Transaction = {
  id: string
  transactionDate: string
  rawDescription: string
  amountCents: number
  reviewStatus: string
  direction: string
  category: { id: string; name: string } | null
  bankAccount: { nickname: string; bankName: string }
  business: { id: string; name: string } | null
}

type TransactionsResponse = {
  data: Transaction[]
  meta: { total: number; page: number; pageSize: number; pages: number }
}

const STATUS_TABS = ['NEEDS_REVIEW', 'REVIEWED', 'UNCLEAR', 'LOCKED'] as const

function statusBadgeVariant(status: string): 'warning' | 'success' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'NEEDS_REVIEW': return 'warning'
    case 'REVIEWED': return 'success'
    case 'UNCLEAR': return 'destructive'
    case 'LOCKED': return 'outline'
    default: return 'secondary'
  }
}

function formatAmount(cents: number): string {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

async function getTransactions(reviewStatus: string, page: string) {
  try {
    return await apiRequestAuthenticated<TransactionsResponse>(
      `/transactions?reviewStatus=${reviewStatus}&pageSize=50&page=${page}`
    )
  } catch {
    return { data: [], meta: { total: 0, page: 1, pageSize: 50, pages: 0 } }
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const reviewStatus = params.reviewStatus ?? 'NEEDS_REVIEW'
  const page = params.page ?? '1'
  const { data: transactions, meta } = await getTransactions(reviewStatus, page)

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaction Review</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {meta.total} transactions
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/transactions/apply-rules">
            <Zap className="h-4 w-4" />
            Apply Rules
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/dashboard/transactions?reviewStatus=${s}`}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              reviewStatus === s
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(txn.transactionDate).toLocaleDateString('en-ZA')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {txn.bankAccount.nickname}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="block truncate text-sm">{txn.rawDescription}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className={txn.direction === 'DEBIT' ? 'text-destructive' : 'text-success'}>
                        {txn.direction === 'DEBIT' ? '−' : '+'}
                        {formatAmount(txn.amountCents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(txn.reviewStatus)}>
                        {txn.reviewStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.category ? (
                        <span className="text-foreground">{txn.category.name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.page} of {meta.pages}</span>
          <div className="flex gap-2">
            {meta.page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page - 1}`}>
                  ← Previous
                </Link>
              </Button>
            )}
            {meta.page < meta.pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/transactions?reviewStatus=${reviewStatus}&page=${meta.page + 1}`}>
                  Next →
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/transactions/page.tsx
git -C ../.. commit -m "feat(web): restyle transactions page with filter tabs and data table"
```

---

### Task 7: Import page

**Files:**
- Modify: `apps/web/app/dashboard/import/page.tsx`

- [ ] **Step 1: Restyle import page**

```tsx
// apps/web/app/dashboard/import/page.tsx
'use client'
import { useActionState } from 'react'
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react'
import { importCsvAction } from './actions'
import type { ImportState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import Bank Statement</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload a Standard Bank CSV file to add new transactions.
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV</CardTitle>
            <CardDescription>Standard Bank transaction export format</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {state.error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountId">Bank Account ID</Label>
                <Input
                  id="bankAccountId"
                  name="bankAccountId"
                  type="text"
                  required
                  placeholder="seed-stdbank-main"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  required
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>Importing…</>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Import Statement
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {state?.summary && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <CardTitle className="text-base text-success">Import complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {[
                  ['File', state.summary.fileName],
                  ['Total rows', state.summary.rowCount],
                  ['Imported', state.summary.importedCount],
                  ['Duplicates skipped', state.summary.duplicateCount],
                  ['Errors', state.summary.errorCount],
                  ['Opening balance', formatCents(state.summary.openingBalanceCents)],
                  ['Closing balance', formatCents(state.summary.closingBalanceCents)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className={`font-medium ${label === 'Errors' && Number(value) > 0 ? 'text-destructive' : ''}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <Separator className="my-4" />
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href="/dashboard/transactions?reviewStatus=NEEDS_REVIEW">
                  Review imported transactions →
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/import/page.tsx
git -C ../.. commit -m "feat(web): restyle import page with upload card and result summary"
```

---

### Task 8: Suppliers page

**Files:**
- Modify: `apps/web/app/dashboard/suppliers/page.tsx`

- [ ] **Step 1: Restyle suppliers page**

```tsx
// apps/web/app/dashboard/suppliers/page.tsx
import { Building2, ExternalLink, Tag } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type Alias = { id: string; pattern: string }
type Supplier = {
  id: string
  name: string
  website: string | null
  notes: string | null
  aliases: Alias[]
}

async function getSuppliers() {
  try {
    const res = await apiRequestAuthenticated<{ data: Supplier[] }>('/suppliers')
    return res.data
  } catch {
    return [] as Supplier[]
  }
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No suppliers yet. Suppliers are created when transactions are categorised.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{supplier.name}</CardTitle>
                {supplier.website && (
                  <CardDescription>
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {supplier.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {supplier.aliases.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      Aliases
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.aliases.map((a) => (
                        <Badge key={a.id} variant="secondary" className="font-mono text-xs">
                          {a.pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No aliases</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/suppliers/page.tsx
git -C ../.. commit -m "feat(web): restyle suppliers page with cards and alias badges"
```

---

### Task 9: Receipts page

**Files:**
- Modify: `apps/web/app/dashboard/receipts/page.tsx`

- [ ] **Step 1: Restyle receipts page**

```tsx
// apps/web/app/dashboard/receipts/page.tsx
import Link from 'next/link'
import { Receipt, ExternalLink } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type ReceiptItem = {
  id: string
  uploaderPhone: string
  capturedAt: string
  matchStatus: string
  isStale: boolean
  hintAmountCents: number | null
  hintDate: string | null
  hintSupplier: string | null
  storagePath: string
  fileName: string
}

type ReceiptsResponse = { receipts: ReceiptItem[] }

const STATUS_TABS = ['', 'UNMATCHED', 'SUGGESTED', 'MATCHED', 'STALE'] as const

function matchStatusVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'MATCHED': return 'success'
    case 'SUGGESTED': return 'warning'
    case 'UNMATCHED': return 'secondary'
    case 'STALE': return 'destructive'
    default: return 'secondary'
  }
}

export default async function ReceiptsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ matchStatus?: string; businessId?: string }>
}) {
  const params = await searchParams
  const activeStatus = params.matchStatus ?? ''

  const qs = new URLSearchParams()
  if (params.matchStatus) qs.set('matchStatus', params.matchStatus)
  if (params.businessId) qs.set('businessId', params.businessId)

  let receipts: ReceiptItem[] = []
  try {
    const res = await apiRequestAuthenticated<ReceiptsResponse>(
      `/receipts${qs.size ? `?${qs}` : ''}`
    )
    receipts = res.receipts
  } catch {
    // empty list on error
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Receipt Inbox</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `?matchStatus=${s}` : '?'}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeStatus === s
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Captured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount Hint</TableHead>
                <TableHead>Date Hint</TableHead>
                <TableHead>Supplier Hint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Receipt className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No receipts found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <a
                        href={r.storagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {r.fileName}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.uploaderPhone}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.capturedAt).toLocaleDateString('en-ZA')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={matchStatusVariant(r.matchStatus)}>
                        {r.matchStatus}
                        {r.isStale ? ' ⚠' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.hintAmountCents != null
                        ? `R ${(r.hintAmountCents / 100).toFixed(2)}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.hintDate
                        ? new Date(r.hintDate).toLocaleDateString('en-ZA')
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.hintSupplier ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/receipts/page.tsx
git -C ../.. commit -m "feat(web): restyle receipts inbox with status tabs and badge colours"
```

---

### Task 10: Reports pages

**Files:**
- Modify: `apps/web/app/dashboard/reports/page.tsx`
- Modify: `apps/web/app/dashboard/reports/[periodId]/page.tsx`

- [ ] **Step 1: Restyle reports list page**

```tsx
// apps/web/app/dashboard/reports/page.tsx
import Link from 'next/link'
import { Lock, LockOpen, Download } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type Period = {
  id: string
  businessId: string
  year: number
  month: number
  status: string
  lockedAt: string | null
}
type PeriodsResponse = { periods: Period[] }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const params = await searchParams
  const businessId = params.businessId

  if (!businessId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Card className="mt-6 py-12">
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Add <code className="rounded bg-muted px-1 py-0.5 text-xs">?businessId=&lt;id&gt;</code> to the URL to view periods for a business.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  let periods: Period[] = []
  try {
    const res = await apiRequestAuthenticated<PeriodsResponse>(`/periods?businessId=${businessId}`)
    periods = res.periods
  } catch {
    // empty list on error
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{periods.length} period{periods.length !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Locked At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground text-sm">
                    No periods found.
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'LOCKED' ? 'success' : 'warning'}>
                        {p.status === 'LOCKED'
                          ? <><Lock className="mr-1 h-3 w-3" />{p.status}</>
                          : <><LockOpen className="mr-1 h-3 w-3" />{p.status}</>
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.lockedAt
                        ? new Date(p.lockedAt).toLocaleDateString('en-ZA')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'LOCKED' && (
                          <>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/reports/${p.id}`}>View</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a href={`/api/periods/${p.id}/export`} download>
                                <Download className="h-4 w-4" />
                                CSV
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Restyle report detail page**

```tsx
// apps/web/app/dashboard/reports/[periodId]/page.tsx
import Link from 'next/link'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

type CategoryItem = { categoryId: string; name: string; amountCents: number }

type SnapshotData = {
  businessId: string
  year: number
  month: number
  generatedAt: string
  totalRevenueCents: number
  totalExpenseCents: number
  netProfitCents: number
  revenueByCategory: CategoryItem[]
  expenseByCategory: CategoryItem[]
  uncategorisedRevenueCents: number
  uncategorisedExpenseCents: number
  transactionCount: number
}
type ReportResponse = { snapshot: SnapshotData }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(cents: number) {
  return `R ${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const { periodId } = await params

  let snapshot: SnapshotData
  try {
    const response = await apiRequestAuthenticated<ReportResponse>(`/periods/${periodId}/report`)
    snapshot = response.snapshot
  } catch {
    return (
      <div className="p-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/dashboard/reports"><ArrowLeft className="h-4 w-4" />Back to Reports</Link>
        </Button>
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Report not available. Lock the period first to generate a snapshot.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const title = `${MONTH_NAMES[snapshot.month - 1]} ${snapshot.year}`
  const netPositive = snapshot.netProfitCents >= 0

  return (
    <div className="p-8">
      {/* Back + download */}
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/periods/${periodId}/export`} download>
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </Button>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title} — P&amp;L Report</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Generated {new Date(snapshot.generatedAt).toLocaleString('en-ZA')} · {snapshot.transactionCount} transactions
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-success" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{fmt(snapshot.totalRevenueCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{fmt(snapshot.totalExpenseCents)}</p>
          </CardContent>
        </Card>
        <Card className={netPositive ? 'border-success/30 bg-green-50' : 'border-destructive/30 bg-red-50'}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Minus className="h-4 w-4" />
              Net Profit / Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netPositive ? 'text-success' : 'text-destructive'}`}>
              {netPositive ? '' : '−'}{fmt(snapshot.netProfitCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-8" />

      {/* Expense breakdown */}
      {snapshot.expenseByCategory.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Expenses by Category</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of expenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.expenseByCategory.map((e) => (
                    <TableRow key={e.categoryId}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(e.amountCents)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {snapshot.totalExpenseCents > 0
                          ? `${((e.amountCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {snapshot.uncategorisedExpenseCents > 0 && (
                    <TableRow>
                      <TableCell className="text-muted-foreground italic">Uncategorised</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fmt(snapshot.uncategorisedExpenseCents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {snapshot.totalExpenseCents > 0
                          ? `${((snapshot.uncategorisedExpenseCents / snapshot.totalExpenseCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue breakdown */}
      {snapshot.revenueByCategory.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Revenue by Category</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.revenueByCategory.map((r) => (
                    <TableRow key={r.categoryId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.amountCents)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {snapshot.totalRevenueCents > 0
                          ? `${((r.amountCents / snapshot.totalRevenueCents) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {snapshot.uncategorisedRevenueCents > 0 && (
                    <TableRow>
                      <TableCell className="text-muted-foreground italic">Uncategorised</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fmt(snapshot.uncategorisedRevenueCents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git -C ../.. add apps/web/app/dashboard/reports/
git -C ../.. commit -m "feat(web): restyle reports list and P&L detail pages"
```

---

### Task 11: Public receipt upload page

**Files:**
- Modify: `apps/web/app/receipts/upload/page.tsx`
- Modify: `apps/web/app/receipts/upload/UploadReceiptForm.tsx`

- [ ] **Step 1: Restyle UploadReceiptForm**

```tsx
// apps/web/app/receipts/upload/UploadReceiptForm.tsx
'use client'
import { useActionState } from 'react'
import { uploadReceiptAction } from './actions'
import type { UploadState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react'

export function UploadReceiptForm() {
  const [state, formAction, isPending] = useActionState<UploadState, FormData>(
    uploadReceiptAction,
    null
  )

  if (state?.receiptId) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="font-medium text-foreground">Receipt submitted!</p>
        <p className="text-sm text-muted-foreground">
          Your receipt has been received and will be matched to a transaction.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <input type="hidden" id="gps-lat" name="lat" />
      <input type="hidden" id="gps-lng" name="lng" />

      <div className="space-y-1.5">
        <Label htmlFor="phone">Your phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="+27 82 123 4567"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file">Receipt image or PDF</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          required
        />
        <p className="text-xs text-muted-foreground">Max 10 MB</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintAmount">Amount (optional)</Label>
        <Input
          id="hintAmount"
          name="hintAmount"
          type="number"
          step="0.01"
          placeholder="150.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintDate">Date (optional)</Label>
        <Input
          id="hintDate"
          name="hintDate"
          type="date"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hintSupplier">Supplier name (optional)</Label>
        <Input
          id="hintSupplier"
          name="hintSupplier"
          type="text"
          placeholder="Pick n Pay, Builders, etc."
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          'Uploading…'
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            Submit Receipt
          </>
        )}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Check existing UploadState type in actions.ts**

```bash
grep -n "UploadState\|receiptId\|error" apps/web/app/receipts/upload/actions.ts
```

Expected: confirms `UploadState` is exported and has `receiptId` and `error` fields.

If `UploadState` is not exported from `actions.ts`, read the file and check what the actual type name is. Update the import in `UploadReceiptForm.tsx` accordingly.

- [ ] **Step 3: Restyle the upload page**

```tsx
// apps/web/app/receipts/upload/page.tsx
import { Receipt } from 'lucide-react'
import { GpsCapture } from './GpsCapture'
import { UploadReceiptForm } from './UploadReceiptForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UploadReceiptPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Submit a Receipt</CardTitle>
          <CardDescription>
            Upload your receipt and we&apos;ll match it to the right transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GpsCapture />
          <UploadReceiptForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Check UploadState type in actions.ts and fix import if needed**

Read `apps/web/app/receipts/upload/actions.ts`:

```bash
cat apps/web/app/receipts/upload/actions.ts
```

If `UploadState` is not exported, update the `UploadReceiptForm.tsx` import to match whatever type name is exported.

- [ ] **Step 5: Verify build**

```bash
cd apps/web && pnpm build
```

Expected: full build passes with 0 errors.

- [ ] **Step 6: Commit**

```bash
git -C ../.. add apps/web/app/receipts/upload/
git -C ../.. commit -m "feat(web): restyle public receipt upload page"
```

---

### Task 12: Final verification and push

- [ ] **Step 1: Run full API test suite to confirm no regressions**

```bash
cd apps/api && pnpm vitest run
```

Expected: 83 tests passing, 0 failing.

- [ ] **Step 2: Run full Next.js build**

```bash
cd apps/web && pnpm build
```

Expected: all pages compiled, no TypeScript errors, no missing imports.

- [ ] **Step 3: Start dev server and manually verify each page**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000` and verify:
- `/login` — centered card, indigo button, Inter font
- `/dashboard` — sidebar visible, nav highlights active route, card grid
- `/dashboard/transactions` — filter tabs, table with coloured amounts
- `/dashboard/import` — upload card
- `/dashboard/suppliers` — supplier cards
- `/dashboard/receipts` — status filter tabs, table
- `/dashboard/reports?businessId=<id>` — period table with lock badges
- `/receipts/upload` — standalone card, no sidebar

- [ ] **Step 4: Commit and push**

```bash
git -C ../.. add -A
git -C ../.. commit -m "feat(web): frontend design complete — all dashboard pages styled"
git -C ../.. push
```

---

## Test count summary

| Phase | Tests |
|-------|-------|
| After Plan 7 (backend complete) | 83 API unit tests |
| Plan 8 (frontend) | +0 new unit tests (UI pages verified via build + visual inspection) |
| **After Plan 8** | **83** |

Frontend pages are server components whose correctness is validated by:
1. TypeScript compilation (no type errors in `pnpm build`)
2. Visual inspection via `pnpm dev`
