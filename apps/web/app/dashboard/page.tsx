import React from 'react'
import Link from 'next/link'
import { ArrowUpFromLine, ListFilter, Building2, Receipt, BarChart3 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CARDS = [
  {
    href: '/dashboard/transactions?reviewStatus=NEEDS_REVIEW',
    icon: ListFilter,
    title: 'Transaction Review',
    description: 'Categorise and approve imported bank transactions',
    accent: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 10%, white)',
  },
  {
    href: '/dashboard/import',
    icon: ArrowUpFromLine,
    title: 'Import Statement',
    description: 'Upload a Standard Bank CSV to add new transactions',
    accent: 'var(--color-primary)',
    bg: 'color-mix(in srgb, var(--color-primary) 8%, white)',
  },
  {
    href: '/dashboard/receipts',
    icon: Receipt,
    title: 'Receipt Inbox',
    description: 'Match field receipts to imported transactions',
    accent: '#6366f1',
    bg: '#eef2ff',
  },
  {
    href: '/dashboard/suppliers',
    icon: Building2,
    title: 'Suppliers',
    description: 'Manage supplier records and description aliases',
    accent: 'var(--color-muted-foreground)',
    bg: 'var(--color-background)',
  },
  {
    href: '/dashboard/reports',
    icon: BarChart3,
    title: 'Reports',
    description: 'Lock monthly periods and download P&L exports',
    accent: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 8%, white)',
  },
] as const

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Kgolaentle Holdings — Business Management System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, icon: Icon, title, description, accent, bg }) => (
          <Link key={href} href={href} className="group block focus-visible:outline-none">
            <Card className="h-full transition-shadow hover:shadow-md group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2" style={{ outlineColor: 'var(--color-primary)' } as React.CSSProperties}>
              <CardHeader>
                <div
                  className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
