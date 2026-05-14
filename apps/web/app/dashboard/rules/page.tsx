import { apiRequestAuthenticated } from '@/lib/api-client.server'
import { RulesClient } from './RulesClient'

type Rule = {
  id: string
  name: string
  descriptionPattern: string
  categoryId: string | null
  supplierId: string | null
  transactionType: string | null
  trustedAutoReview: boolean
  priority: number
  active: boolean
  category?: { name: string } | null
  supplier?: { name: string } | null
}

type Category = { id: string; name: string; categoryType: string }
type Supplier = { id: string; name: string }

async function getRules(): Promise<Rule[]> {
  try {
    const res = await apiRequestAuthenticated<{ data: Rule[] }>('/rules')
    return res.data ?? []
  } catch {
    return []
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await apiRequestAuthenticated<{ data: Category[] }>('/categories')
    return res.data ?? []
  } catch {
    return []
  }
}

async function getSuppliers(): Promise<Supplier[]> {
  try {
    const res = await apiRequestAuthenticated<{ data: Supplier[] }>('/suppliers')
    return (res.data ?? []).map((s: Supplier & { data?: never }) => ({ id: s.id, name: s.name }))
  } catch {
    return []
  }
}

export default async function RulesPage() {
  const [rules, categories, suppliers] = await Promise.all([
    getRules(),
    getCategories(),
    getSuppliers(),
  ])

  return <RulesClient rules={rules} categories={categories} suppliers={suppliers} />
}
